"""
tests/conftest.py
-----------------
Shared fixtures and environment setup for the entire test suite.

Setting env vars at module level (before any imports) ensures the
supabase_client module can initialise without a real key.
"""

import os

# Set before supabase_client is imported — dotenv won't override these
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-test-key-for-unit-tests")

from unittest.mock import MagicMock, patch

import pytest


def _make_mock_table(data=None):
    """Return a MagicMock that mimics the supabase fluent query builder."""
    t = MagicMock()
    t.insert.return_value = t
    t.upsert.return_value = t
    t.select.return_value = t
    t.eq.return_value = t
    t.execute.return_value = MagicMock(data=data or [])
    return t


@pytest.fixture()
def mock_supabase():
    """
    Patch routers.answers.supabase for the duration of each test.

    Each call to .table(name) returns the *same* mock for a given name so
    tests can inspect per-table call history via mock._tables["<name>"].
    """
    tables: dict[str, MagicMock] = {}

    def get_table(name: str) -> MagicMock:
        if name not in tables:
            tables[name] = _make_mock_table()
        return tables[name]

    with patch("services.supabase_client.supabase") as mock:
        mock.table.side_effect = get_table
        mock._tables = tables   # expose for granular assertions
        yield mock
