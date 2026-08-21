#  Copyright 2025 Collate
#  Licensed under the Collate Community License, Version 1.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  https://github.com/open-metadata/OpenMetadata/blob/main/ingestion/LICENSE
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

"""
Tests for get_safe_query_statement_source, the SQL-injection fix for the
Postgres connector's queryStatementSource config field (unvalidated string
previously interpolated directly into a raw SQL FROM clause).
"""
from sqlalchemy import create_engine

from metadata.ingestion.source.database.postgres.utils import (
    get_safe_query_statement_source,
)


def _engine():
    return create_engine("postgresql+psycopg2://user:pass@localhost/db")


def test_defaults_to_pg_stat_statements_when_not_configured():
    assert get_safe_query_statement_source(_engine(), None) == "pg_stat_statements"


def test_defaults_to_pg_stat_statements_when_empty_string():
    assert get_safe_query_statement_source(_engine(), "") == "pg_stat_statements"


def test_passes_through_simple_identifier_unquoted():
    # SQLAlchemy's identifier_preparer only adds quotes when required (mixed
    # case, special characters, reserved words) - a plain lowercase identifier
    # like this one is valid and unambiguous unquoted.
    assert (
        get_safe_query_statement_source(_engine(), "pg_stat_statements")
        == "pg_stat_statements"
    )


def test_quotes_schema_qualified_identifier_preserving_dot():
    result = get_safe_query_statement_source(
        _engine(), "my_schema.custom_pg_stat_statements"
    )
    assert result == "my_schema.custom_pg_stat_statements"


def test_escapes_embedded_double_quotes():
    # A literal double-quote inside the value must be doubled (standard SQL
    # identifier escaping), not left unescaped where it could close the quoted
    # identifier early and resume executing attacker-supplied SQL.
    result = get_safe_query_statement_source(_engine(), 'evil" OR 1=1 --')
    assert result == '"evil"" OR 1=1 --"'


def test_neutralizes_sql_injection_payload():
    # PoC payload from the security report (CNTT-18586, Finding #2): a subquery
    # meant to exfiltrate data via the FROM clause.
    payload = (
        "(SELECT CAST('LEAKED:' || note AS int) AS query, now() AS total_exec_time, "
        "1 AS dbid, 1 AS userid FROM secret_data LIMIT 1)"
    )
    result = get_safe_query_statement_source(_engine(), payload)

    # The whole payload must come back as a single quoted identifier: exactly the
    # opening and closing quote, nothing in between able to close it early and
    # resume as executable SQL.
    assert result.startswith('"')
    assert result.endswith('"')
    assert result.count('"') == 2
