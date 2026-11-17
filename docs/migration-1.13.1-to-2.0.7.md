# Migrating the Company Deployment: OpenMetadata 1.13.1 → 2.0.7

**Status:** build and local smoke-test complete (`recognizers-2.0.7` branch, verified against a full local Docker stack). This doc is the runbook for taking that branch from "builds and runs locally" to "running in the company's actual environment."

**Audience:** whoever operates the company's OpenMetadata deployment, on the company dev machine that currently builds/pushes the 1.13.1 images.

## Assumptions and placeholders

I don't have visibility into the company's registry hostname, production DB connection details, or deployment platform (compose / k8s / VM). Everywhere one of these is needed, this doc uses a placeholder — replace before running anything against production:

| Placeholder | What it means |
|---|---|
| `<COMPANY_REGISTRY>` | Your container registry host + namespace, e.g. `registry.company.com/openmetadata` |
| `<PROD_DB_HOST>`, `<PROD_DB_PORT>`, `<PROD_DB_NAME>` | Production MySQL/Postgres connection details |
| `<PROD_DB_USER>` / `<PROD_DB_PASSWORD>` | Credentials with migration privileges (DDL) on that database |

Confirm these, and confirm how your deployment currently references image tags (compose file, Helm values, k8s manifests) before Step 7.

---

## 1. What's actually changing

- Base version: `1.13.1` → `2.0.7`.
- Custom features carried forward: Recognizers Tab, Report-Tag Feedback & Approval, Auto-Classification `classificationNames` field. All three were re-integrated against 2.0.7's current code (not a mechanical patch replay — see the full audit at `docs/base-version-upgrade-audit.md` for what changed and why).
- One genuine security fix carried forward: the Postgres `queryStatementSource` SQL-injection fix (re-implemented against 2.0.7's restructured connection-testing framework — this was **not** present upstream and had to be re-applied).
- One hygiene fix carried forward: Docker CRLF normalization for `openmetadata-start.sh`.
- Everything else from the 1.13.1 fork's security backports (dependency CVE bumps, auth fixes, etc.) is **already in 2.0.7 natively** — nothing else needed porting. Full list in the audit doc referenced above.
- Schema/search: 2.0.7 includes Flyway-based native SQL migrations and a search-index remapping relative to 1.13.1. Both run automatically via the stack's migration job and the `SearchIndexingApplication` (confirmed in local testing) — see Steps 8–9.

## 2. Git remote setup on the company dev machine

On the company dev machine, add (or repoint) a remote named `upstream` to the GitHub repo that holds this work:

```bash
git remote add upstream https://github.com/tranttha/OpenMetadata.1.13.1.git
# if it already exists under that name:
git remote set-url upstream https://github.com/tranttha/OpenMetadata.1.13.1.git

git fetch upstream
```

This is independent of whatever `origin` currently means on that machine — leave `origin` as-is unless you have a separate reason to change it.

**Before this step is usable, `recognizers-2.0.7` needs to exist on that GitHub repo.** Right now it's an uncommitted worktree on this machine. Someone needs to commit and push it:

```bash
git add -A
git commit -m "feat: port Recognizers/Report-Tag Feedback/Auto-Classification + security fixes onto 2.0.7"
git push origin recognizers-2.0.7
```

(Run from the worktree, with `origin` pointing at `tranttha/OpenMetadata.1.13.1.git` — confirm before pushing, this is a real push to a shared remote.)

Then on the company dev machine:

```bash
git checkout -b recognizers-2.0.7 upstream/recognizers-2.0.7
```

## 3. Dev machine prerequisites

Pin these exactly — the build hit two silent-failure traps from "close enough" tool versions:

- **Java 21, Eclipse Temurin specifically.** `JAVA_HOME` must point at a Temurin 21 JDK. A generic/newer JDK (we hit this with Homebrew's `openjdk` formula, which resolved to JDK 25) breaks Lombok with a cryptic `ExceptionInInitializerError: com.sun.tools.javac.code.TypeTag :: UNKNOWN` during the `common` module's compile — not an error that points at the real cause.
  ```bash
  export JAVA_HOME=/path/to/temurin-21   # verify: $JAVA_HOME/bin/java -version
  ```
- **Node 22.23.4 exactly**, matching `openmetadata-ui/src/main/resources/ui/package.json`'s `engines.node`. Node 22.17.0 (a different 22.x patch) fails `yarn install` for `@openmetadata/ui-core-components` with an explicit engine-version error. If using nvm: `nvm install 22.23.4 && nvm use 22.23.4`.
- Maven 3.9+, Docker, and (if rebuilding the ingestion image) Python 3.10/3.11 are otherwise standard — no surprises there.

## 4. Build the images locally

This reuses the process already documented in this branch's `README.md` ("Rebuilding Docker Images Locally"), run from the repo root:

```bash
source <(env JAVA_HOME=/path/to/temurin-21 true) 2>/dev/null  # just make sure JAVA_HOME is exported in this shell
export JAVA_HOME=/path/to/temurin-21

mvn -DskipTests clean package
```

This is a full multi-module reactor build (~15 Java modules + the UI's production webpack/vite build). Expect 15-25 minutes on a cold local Maven cache; subsequent builds reuse `~/.m2` and are faster. It produces `openmetadata-dist/target/openmetadata-*.tar.gz`, which the Dockerfiles below unpack.

**openmetadata-server:**
```bash
docker build -f docker/development/Dockerfile -t openmetadata-server:2.0.7 .
```

**openmetadata-ingestion:**
```bash
docker build -f ingestion/Dockerfile -t openmetadata-ingestion:2.0.7 .
# add --build-arg INGESTION_DEPENDENCY=slim for the lighter-weight variant
```

> **Known flaky step:** this build's `pip install ".[all]"` layer downloads a 317MB `pyspark` sdist from `files.pythonhosted.org`. On a network path with poor throughput to that specific host, pip's resume-retry loop can run for 50+ minutes before failing outright — this is a pip/network behavior, not a build config issue. If it happens on the company dev machine: retry once (pip resumes from where the layer-cache left off); if it fails again, try from a different network path, or pre-download the wheel and feed it via a local PyPI mirror/cache. This is unrelated to anything this port changed.

**omjob-operator** (only if the company uses the k8s operator):
```bash
cd openmetadata-k8s-operator
make docker VERSION=2.0.7
```

## 5. Tag and push to the company registry

```bash
docker tag openmetadata-server:2.0.7     <COMPANY_REGISTRY>/openmetadata-server:2.0.7
docker tag openmetadata-ingestion:2.0.7  <COMPANY_REGISTRY>/openmetadata-ingestion:2.0.7

docker push <COMPANY_REGISTRY>/openmetadata-server:2.0.7
docker push <COMPANY_REGISTRY>/openmetadata-ingestion:2.0.7
```

Keep the existing `1.13.1` (or `1.13.1-security-patch`, matching whatever tag is currently deployed) images in the registry untouched — they're the rollback target.

## 6. Pre-migration checklist (production)

Do all of this before touching the production database or swapping any image tag:

- [ ] **Back up the production database.** A full dump/snapshot, taken immediately before the migration window — this is destructive if skipped; the schema migration in Step 8 is a one-way Flyway run.
- [ ] **Note the currently-running image tags** (server, ingestion, db) for rollback reference.
- [ ] **Pause ingestion pipelines** / freeze new ingestion runs for the migration window, if the company runs scheduled ingestion via Airflow.
- [ ] **Notify users** of the maintenance window — the server will be briefly unavailable during migration + restart.
- [ ] Confirm Elasticsearch/OpenSearch has enough headroom for a full reindex (Step 9 triggers one automatically; it ran cleanly in local testing against a single-node ES 9.3.0).

## 7. Deploy the new images

Update whatever the company's deployment references image tags from (compose file / Helm values / k8s manifests — not something I have visibility into) to point at `<COMPANY_REGISTRY>/openmetadata-{server,ingestion}:2.0.7`.

Startup order matters — the migration job must complete before the server starts:
1. `execute-migrate-all` (or equivalent migration job) against `<PROD_DB_HOST>` — runs the Flyway native SQL migrations bundled in the 2.0.7 distribution.
2. `openmetadata-server` — starts only after the migration job exits 0.
3. `ingestion` (if used) — starts independently, no ordering dependency on the server.

In local testing this exact sequence (migrate → server, via `docker compose up`) completed cleanly and the server auto-triggered a full search reindex on startup (see Step 9) without any manual step.

## 8. Schema migration

The migration job runs automatically as part of Step 7's startup sequence — it's the same `bootstrap/sql` native migrations that ship in every OpenMetadata release, pointed at `<PROD_DB_HOST>`/`<PROD_DB_PORT>`/`<PROD_DB_NAME>` via whatever env vars your deployment already uses for DB connection (unchanged from 1.13.1's config shape — nothing this port touched affects DB connection config).

This is the step the Step 6 backup protects against. If it fails partway through, restore from that backup rather than attempting to resume.

## 9. Search reindexing

2.0.7's server automatically runs `SearchIndexingApplication` as part of its startup migration sequence — confirmed in local testing (`✓ SearchIndexingApplication completed successfully`, logged right after the migration job exits). No manual reindex step should be needed. If you want to re-trigger it manually afterward: Settings → Applications → Search Indexing → Run Now.

## 10. Post-migration verification

```bash
curl -s https://<your-om-host>/api/v1/system/version
# expect: {"version":"2.0.7",...}
```

Then manually smoke-test the custom features:
- **Recognizers Tab** — any Tag's detail page.
- **Auto-Classification config** — a Classification's detail page (e.g. PII).
- **Report-Tag feedback popover** — hover an auto-tagged column, click through to the feedback modal.
- **FeedbackApprovalTask** — governance/task list, after submitting feedback above.
- **`classificationNames`** — when creating/editing an Auto-Classification ingestion pipeline (Database or Storage service only — deliberately not extended to Messaging services, see the audit doc).

Also worth a quick check given this port touched auth code paths: existing login flows (OIDC/SAML/basic, whichever the company uses) still work — the Postgres fix and the reviewer-authz fix (already resolved upstream, not something this port changed) both touch authorization-adjacent code.

## 11. Rollback plan

If anything in Steps 7-9 goes wrong before the migration job completes:
1. Stop the new containers.
2. Restore the database from the Step 6 backup.
3. Redeploy the previous `1.13.1` (or `1.13.1-security-patch`) images noted in Step 6.
4. Restart in the original order.

Once the Step 8 migration job has completed successfully against production, **rolling back the schema is not straightforward** (Flyway migrations aren't auto-reversible) — treat the window between "migration job starts" and "you've verified Step 10" as the point of no easy return, and don't rush past the pre-migration checklist to get there.

## 12. Reference

Full audit of what was ported vs. already-resolved upstream, including the reasoning behind every judgment call (why `classificationNames` doesn't extend to messaging, why the Postgres fix needed re-implementation, what the branch-C UX fixes were and why they weren't ported): `docs/base-version-upgrade-audit.md`.
