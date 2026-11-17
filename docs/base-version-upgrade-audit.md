# Base Version Upgrade: Consolidated Change Inventory (1.13.1 → 2.0.7)

**Date:** 2026-11-16
**Status:** Audit complete. Verified against real file content in `upstream/2.0.7-release` (git show/diff, not PR-number inference). Refactor onto 2.0.7 not yet started.

## Method

For every commit across the fork's branches/worktrees, classified as:
- **RESOLVED-UPSTREAM** — 2.0.7 already contains equivalent/superseding behavior. Do not migrate.
- **REOPENED** — 2.0.7 does not contain the fix. Must be ported onto the 2.0.7 base.
- **CUSTOM (always port)** — no upstream equivalent possible; feature is fork-only.

Branches inspected: `recognizers-1.13.1` (A, pom 1.13.1, production custom fork), `worktree-omd-1.13.3-recognizers-merge` (B, pom 1.13.3, custom features already merged forward), `worktree-tag-feedback-approval-plan` (C, abandoned early prototype of the same features), plus the uncommitted `1.13.2-security-backport.patch` (D) sitting on branch A in the `tag-feedback-report-and-approval-ui` worktree.

---

## Part 1 — Custom features (no upstream equivalent; always need porting onto 2.0.7)

**Scope correction (second-pass verification):** the Recognizer/RecognizerFeedback **backend** — `recognizer.json`, `recognizerFeedback.json`, the `pattern`/`exactTerms`/`predefined`/`customRecognizer` schemas, `createTagWithRecognizers.json`, `RecognizerFeedbackRepository.java`, the governance workflow tasks (`Apply/RejectRecognizerFeedbackTask`), `TagResource`'s `POST /tags/name/{fqn}/feedback` endpoint, `PiiRecognizerMigrationUtil.java` — is **stock OpenMetadata, not fork-authored**. Diffed byte-for-byte identical between branch B and `2.0.7-release` on every file checked, including the REST resource method. The fork never wrote backend code for this feature because the backend already existed upstream (including at 1.13.1) — it only ever needed the UI. **This means Part 1's porting scope is UI-only; there is no backend porting work for Recognizers/Report-Tag Feedback.**

| Feature | Canonical source | Status |
|---|---|---|
| Auto-Classification `classificationNames` field (2 pipeline JSON schemas + `classification.py` hook + generated TS) | A/B identical | **REOPENED, not a clean re-add.** Confirmed absent from 2.0.7's schemas. Upstream added a *third* pipeline schema (`messagingServiceAutoClassificationPipeline.json`) and restructured `classification.py`'s `isinstance` dispatch into a 3-way branch in the interim — needs re-integration into the new shape, plus a product decision on whether `classificationNames` should extend to the new messaging pipeline too. **verdict** dont extend the `classificationNames` to messaging pipelines, extend the elif isinstance(source_config, MessagingServiceAutoClassificationPipeline) |
| Recognizers Tab UI (list/enable/disable/delete, create/edit drawer, exceptions modal, Exact-Term type) | A/B, built on `@openmetadata/ui-core-components` | Ready to port — pure frontend, backend contract unchanged |
| Report-Tag Feedback & Approval UI (hover popover, feedback modal, `postRecognizerFeedback` API client, `FeedbackApprovalTask` rendering on the generic Task framework) | A/B, core-components | Ready to port — pure frontend, backend contract unchanged |
| Associated i18n keys (17 locales) | A/B | Regenerate via `yarn i18n` after porting; don't hand-port translations |

**Reconciliation finding:** B's merge commit (`d853fc0311`, "rebase Recognizers UI and DomainIndex fix onto 1.13.3-release") carries the same file set as A, with a small **content** diff on top (not literally byte-identical — confirmed by direct diff, correcting an earlier file-list-only check): `EntityUtils`→`EntityNameUtils` and `StringsUtils`→`StringUtils` import renames (1.13.3 util reshuffle) plus a null-safety guard added around a `clearTimeout` call. **B is still the canonical source** — these are mechanical adaptations for the 1.13.3 base, not independent feature work.

**C is an abandoned earlier prototype**, diverged from the same merge-base (`afcb2d2c`) but never merged into A or B. It predates A's rewrite onto `ui-core-components` (C still has `RecognizerForm.tsx` instead of A/B's `RecognizerFormDrawer.tsx`, different file structure entirely — not just a naming change). **Do not port C's code.** However, C fixed four UX bugs on its old Ant-Design-era implementation that have no corresponding fix in A/B's rewrite:
- Exceptions table not horizontally scrollable in the modal
- Exceptions modal going stale after the `recognizer` tag prop updates
- Recognizer form select dropdowns clipped by the drawer's stacking context
- Recognizer edit/delete icons not sized/visible correctly

Spot-check: B's current `RecognizerExceptionsModal.tsx` derives `exceptions` directly from props each render (no stale local-state copy), so the staleness bug class likely doesn't apply to the rewrite — but this is inference, not a runtime check. **Recommend a UI smoke-test pass on these four behaviors after porting**, since `ui-core-components`' `Table`/`Modal`/`Select` primitives may or may not already handle them — don't assume either way without looking.

**Process item (not a code change):** commit `83e4962de2` on A commits compiled `.jar` files under `openmetadata-service/target/` and `openmetadata-ui/target/` into git. **Decided: stop.** `.gitignore` build output on the 2.0.7 branch; no known deployment dependency on jars being tracked in git.

---

## Part 2 — Upstream-sourced fixes/backports, checked against `2.0.7-release`

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | #30026 — `RuleEvaluator`/`DefaultAuthorizer`: no reviewer-authz shortcut on CREATE | **RESOLVED** | `RuleEvaluator.java` and `DefaultAuthorizer.java` in 2.0.7 both have `instanceof CreateResourceContext` check, verbatim |
| 2 | #29793/#29675 — App bot JWT / `privateConfiguration` secret leak via API & version history | **RESOLVED** | `AppRepository.RUNTIME_SECRET_FIELDS`, `serializeForVersionHistory`, and `AppResource.unsetAppRuntimeProperties`/`stripRuntimeSecretsFromSnapshot` all present verbatim in 2.0.7, with *more* call sites covered than the fork's patch (AppResource.java grew since) |
| 3 | #30024 — trim vulnerable apt packages (ingestion Docker) | **RESOLVED** | 2.0.7's `ingestion/Dockerfile` removes `alien`, `docker-ce-cli`, and far more — superseded |
| 4 | #30454 — perl/nss OS-package CVEs (ingestion Docker) | **RESOLVED** | 2.0.7 explicitly `--only-upgrade`s `perl perl-base perl-modules-5.36 libperl5.36 libnss3` |
| 5 | #30034 — 6 CVE ingestion deps (PyJWT, cryptography, mistune, pydantic-settings, python-multipart, tornado) | **RESOLVED** | 2.0.7's `ingestion/setup.py` pins meet or exceed every target version (e.g. PyJWT ≥2.15.0 vs. patch's ≥2.13.0 target) |
| 6 | #30311 — log4j 2.25.4→2.25.5 | **RESOLVED** | 2.0.7 pom: `log4j.version` = 2.25.5 |
| 7 | #30396 — Jackson/Logback/postgres-JDBC/Calcite bumps | **RESOLVED** | 2.0.7: Jackson 2.18.11, Logback 1.5.38, `postgres.connector.version`=42.7.14 (≥ 42.7.12 target), `calcite-core` version=1.42.0 (exact match) — confirmed via direct property grep, all at or past target |
| 8 | #30516 — Trivy: airflow 3.2.1→3.2.2 + Spark/Hive jars + perl/nss | **RESOLVED** | 2.0.7 ingestion Dockerfile is on `apache/airflow:3.3.2-python3.12` — superseded well past the target |
| 9a | (CNTT-18586 finding 1) `authorizeRequests()` skipped impersonation check | **RESOLVED** (different mechanism) | 2.0.7 centralizes impersonation validation inside `getSubjectContext()`/`validateImpersonation()`, called by every authorize path uniformly — structurally better than the fork's single-call-site patch |
| 9b | (CNTT-18586 finding 2) Postgres `queryStatementSource` SQL injection in `connection.py`/`query_parser.py` | **REOPENED** | 2.0.7's `connection.py:187` and `query_parser.py:74` still do `self.service_connection.queryStatementSource or "pg_stat_statements"` raw string interpolation, no `get_safe_query_statement_source`-style quoting helper. Code structure changed (postgres connection testing now goes through a `Checks`/`Evidence` framework) — needs re-implementing against the new structure, not a verbatim port. |
| 9c | (CNTT-18586 finding 3) OIDC `redirect_uri` open redirect / id_token exfiltration | **RESOLVED** (different mechanism) | 2.0.7 has a full configurable-allowlist fix (`requireRedirectUri`/`trustedRedirects`/`SecurityUtil.validateRedirectUri`, positive-match-only — throws unless an exact allowlist match) — matches the "Option 2" the fork's own Vietnamese analysis doc (`finding-3-open-redirect-phuong-an-fix.txt`) considered but didn't implement. Additionally, `buildRedirectWithToken()` now places the token in the URL **fragment** (`#id_token=...`) rather than a query param, which browsers don't send to the server/proxies on the next navigation — a second layer of protection beyond origin-matching. Corresponds to upstream PR #30287 / issue #5183, visible in `main`'s history. |
| 10 | "missing-slash-scheme bypass" follow-up fix to the fork's own same-origin check | **MOOT** | The vulnerable code (`isRedirectUriTrusted`/`isSafeRelativeReference`) doesn't exist in 2.0.7 — superseded by 9c's structurally different allowlist implementation. Verified 2.0.7's `SecurityUtil.validateRedirectUri` rejects the same bypass class (`//` prefix, opaque-scheme URIs) through its own `isAbsolute()`-based branching — no equivalent bug found. Nothing to port. |
| 11 | Docker CRLF normalization for `openmetadata-start.sh` (Windows-checkout hygiene) | **REOPENED — port it** | Fork-environment-specific, never an upstream concern. 2.0.7 has no `.gitattributes` and no `tr -d '\r'` step — plain `COPY --chmod=755`. **Decided: port forward** — cheap, zero downside, keeps the safety net regardless of current contributor OS mix. |
| 12 | #30473 — Snowflake FK collision across tables sharing a constraint name | **RESOLVED** | 2.0.7's `snowflake/utils.py` keys `foreign_key_map` on `(name, table_name)`, verbatim |
| 13 | #30614 — intake-forms: render every custom-property type correctly | **RESOLVED** | `IntakeFormRepository.java` and related files exist in 2.0.7 |
| 14 | #29394 — playwright logs viewer bundle suite pagination | **RESOLVED** | `logsViewer.ts` util exists in 2.0.7's playwright utils |
| 15 | #30518 — notifications: skip recipients without contact info | **RESOLVED** | `TeamRecipientResolver.java`/`UserRecipientResolver.java` in 2.0.7 have `TEAM_FIELDS`/email-presence filtering, verbatim |
| 16 | governance: sanitize poisoned trigger filters (v1133 migration) | **RESOLVED** | `FilterEntityImpl.java` in 2.0.7 has `sanitizeFilterValue`/`FILTER_MAP_TYPE`, verbatim |
| 17 | #30712 — playwright: paginate across pages in GlossaryTermRelationSettings tests | **RESOLVED** | `findRowAcrossPages` present in 2.0.7's spec file |
| 18 | DomainIndex: index domain parent so Sub Domains tab counts children after reindex (explicit port of upstream PR #29118) | **RESOLVED** | `DomainIndex.java` in 2.0.7 has `getRequiredReindexFields()` adding `FIELD_PARENT`, verbatim |
| 19 | "Fix SearchRBAC tests" (Playwright, test-only) | **N/A — test infra** | Pure E2E test-file churn, no production code. Playwright suite will need re-authoring against 2.0.7's UI regardless of this specific fix; not meaningfully portable as a standalone item. |

### Net result

Of ~20 tracked items, **17 are already resolved in 2.0.7** (several via more thorough mechanisms than the fork's own patches — notably the OIDC redirect and impersonation-check fixes). Only **two items genuinely need porting**:
1. **Postgres `queryStatementSource` SQL injection** (9b) — real, unresolved vulnerability in 2.0.7, needs fresh implementation against the new Checks/Evidence connection-testing framework.
2. **Docker CRLF normalization** (11) — optional, environment-hygiene only.

Everything else in the security-backport/bugfix category can be **dropped from the migration**, not reapplied.

### Decisions (resolved 2026-11-16)
- **Target tag: `2.0.7-release`**, as audited. Not re-targeting 2.0.8 — avoids a re-audit pass for one patch release of marginal benefit.
- **Docker CRLF fix (item 11): port it forward.**
- **Committed `.jar` artifacts: stop.** `.gitignore` build output going forward.
- **C's 4 UX fixes: defer.** Port the UI first; verify these 4 specific behaviors (table overflow, modal staleness, dropdown stacking-context, icon sizing) manually once the app is running on 2.0.7, as part of normal pre-ship QA rather than blocking the port on it now.
- **`classificationNames` / messaging pipeline scope: don't extend.** Port only the DB/Storage schema changes; adopt 2.0.7's new `elif isinstance(source_config, MessagingServiceAutoClassificationPipeline)` branch as-is (inherited upstream structure, not custom-scoped) so messaging pipelines keep upstream's default PII-only behavior.

---

## Overall porting scope (Part 1 + Part 2 combined)

What actually needs to be written/ported onto `2.0.7-release`:

1. **Recognizers Tab + Report-Tag Feedback & Approval — UI only.** Backend is stock upstream, already in 2.0.7 unchanged. Port branch B's frontend code directly against the existing backend contract.
2. **`classificationNames` field — needs re-integration, not a re-add.** Upstream restructured `classification.py`'s dispatch into 3 branches and added a third pipeline schema (messaging) since 1.13.1. Requires a product decision on messaging-pipeline scope before implementing.
3. **Postgres SQL injection fix (9b)** — reimplement against 2.0.7's restructured Checks/Evidence connection-testing framework.
4. **Docker CRLF normalization (11)** — optional, reapply only if still relevant to SSI's dev environment.
5. **Decision needed:** keep or drop committing compiled `target/*.jar` files going forward.
6. **UX smoke-test** the four behaviors C's abandoned prototype once fixed (table overflow, modal staleness, dropdown stacking-context, icon sizing) against B's rewritten core-components implementation — don't assume either way.

Everything else audited in Part 2 (dependency bumps, Snowflake FK, notifications, governance filter sanitization, DomainIndex reindex, intake-forms, impersonation-bypass, OIDC open-redirect) is confirmed already in 2.0.7 and should **not** be reapplied.
