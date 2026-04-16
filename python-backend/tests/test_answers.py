"""
tests/test_answers.py
---------------------
Tests for POST /answers and the update_gap_scores_cache helper.
Run with:  pytest tests/test_answers.py -v
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, call, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app

# ---------------------------------------------------------------------------
# Client fixture (no real CSVs needed for answer tests)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    import pandas as pd
    app.state.descriptions_df = pd.DataFrame()
    app.state.reviews_df = pd.DataFrame()
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MINIMAL_PAYLOAD = {
    "sessionId": "sess-test",
    "propertyId": "prop-123",
    "answers": [],
}

TWO_ANSWER_PAYLOAD = {
    "sessionId": "sess-two",
    "propertyId": "prop-123",
    "inputMode": "text",
    "starRating": 4,
    "answers": [
        {"gapCategory": "pet_policy", "selectedOption": "no"},
        {"gapCategory": "parking",    "selectedOption": "free", "freeText": "big parking lot"},
    ],
}


# ===========================================================================
# 1. Response shape & points arithmetic
# ===========================================================================

class TestResponseShape:
    def test_success_flag_is_true(self, client, mock_supabase):
        r = client.post("/answers", json=TWO_ANSWER_PAYLOAD)
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_points_earned_two_answers(self, client, mock_supabase):
        r = client.post("/answers", json=TWO_ANSWER_PAYLOAD)
        assert r.json()["pointsEarned"] == 100   # 2 × 50

    def test_points_earned_one_answer(self, client, mock_supabase):
        payload = {**MINIMAL_PAYLOAD, "answers": [{"gapCategory": "spa", "selectedOption": "yes_great"}]}
        assert client.post("/answers", json=payload).json()["pointsEarned"] == 50

    def test_points_earned_zero_answers(self, client, mock_supabase):
        r = client.post("/answers", json=MINIMAL_PAYLOAD)
        assert r.json()["pointsEarned"] == 0

    def test_points_earned_five_answers(self, client, mock_supabase):
        payload = {
            **MINIMAL_PAYLOAD,
            "answers": [{"gapCategory": f"cat_{i}", "selectedOption": "x"} for i in range(5)],
        }
        assert client.post("/answers", json=payload).json()["pointsEarned"] == 250


# ===========================================================================
# 2. Validation — 422 on bad input
# ===========================================================================

class TestValidation:
    def test_missing_session_id_returns_422(self, client, mock_supabase):
        r = client.post("/answers", json={"propertyId": "p1", "answers": []})
        assert r.status_code == 422

    def test_missing_property_id_returns_422(self, client, mock_supabase):
        r = client.post("/answers", json={"sessionId": "s1", "answers": []})
        assert r.status_code == 422

    def test_missing_answers_returns_422(self, client, mock_supabase):
        r = client.post("/answers", json={"sessionId": "s1", "propertyId": "p1"})
        assert r.status_code == 422

    def test_answers_item_missing_gap_category_returns_422(self, client, mock_supabase):
        r = client.post("/answers", json={
            "sessionId": "s1", "propertyId": "p1",
            "answers": [{"selectedOption": "no"}],   # gapCategory omitted
        })
        assert r.status_code == 422

    def test_optional_fields_may_be_absent(self, client, mock_supabase):
        """inputMode, starRating, selectedOption, freeText are all optional."""
        r = client.post("/answers", json={
            "sessionId": "s1", "propertyId": "p1",
            "answers": [{"gapCategory": "parking"}],
        })
        assert r.status_code == 200

    def test_star_rating_null_accepted(self, client, mock_supabase):
        r = client.post("/answers", json={**MINIMAL_PAYLOAD, "starRating": None})
        assert r.status_code == 200

    def test_input_mode_voice_accepted(self, client, mock_supabase):
        r = client.post("/answers", json={**MINIMAL_PAYLOAD, "inputMode": "voice"})
        assert r.status_code == 200


# ===========================================================================
# 3. Database writes — verify correct tables are hit
# ===========================================================================

class TestDatabaseWrites:
    def test_review_sessions_table_is_written(self, client, mock_supabase):
        client.post("/answers", json=TWO_ANSWER_PAYLOAD)
        tables_called = [c.args[0] for c in mock_supabase.table.call_args_list]
        assert "review_sessions" in tables_called

    def test_gap_answers_table_is_written(self, client, mock_supabase):
        client.post("/answers", json=TWO_ANSWER_PAYLOAD)
        tables_called = [c.args[0] for c in mock_supabase.table.call_args_list]
        assert "gap_answers" in tables_called

    def test_gap_answers_insert_skipped_when_empty(self, client, mock_supabase):
        """With an empty answers list, gap_answers insert must not be called
        (the background task still SELECTs the table to recompute the cache,
        but no rows should be inserted)."""
        client.post("/answers", json=MINIMAL_PAYLOAD)
        # gap_answers mock may exist (SELECT from cache update) but insert must not be called
        gap_mock = mock_supabase._tables.get("gap_answers")
        if gap_mock is not None:
            gap_mock.insert.assert_not_called()

    def test_background_task_triggers_cache_upsert(self, client, mock_supabase):
        """TestClient runs background tasks synchronously — cache write must happen."""
        client.post("/answers", json=TWO_ANSWER_PAYLOAD)
        tables_called = [c.args[0] for c in mock_supabase.table.call_args_list]
        assert "gap_scores_cache" in tables_called


# ===========================================================================
# 4. Unit tests for update_gap_scores_cache
# ===========================================================================

class TestUpdateGapScoresCache:
    """Direct unit tests — bypasses the HTTP layer entirely."""

    def _run(self, mock_data: list[dict], property_id: str = "prop-x"):
        """
        Call update_gap_scores_cache with mock_data as the existing gap_answers,
        capture the upsert payload, and return (scores_dict, upsert_kwargs).
        """
        from routers.answers import update_gap_scores_cache

        upsert_payload = {}
        upsert_kwargs  = {}

        def fake_table(name):
            t = MagicMock()
            t.select.return_value = t
            t.eq.return_value     = t
            t.upsert.side_effect  = lambda payload, **kw: (
                upsert_payload.update(payload) or upsert_kwargs.update(kw) or t
            )
            t.execute.return_value = MagicMock(data=mock_data)
            return t

        with patch("services.supabase_client.supabase") as mock:
            mock.table.side_effect = fake_table
            update_gap_scores_cache(property_id)

        return upsert_payload.get("scores", {}), upsert_payload, upsert_kwargs

    # --- aggregation correctness ---

    def test_answer_count_per_category(self):
        scores, *_ = self._run([
            {"gap_category": "pet_policy", "selected_option": "no",   "free_text": None},
            {"gap_category": "pet_policy", "selected_option": "no",   "free_text": None},
            {"gap_category": "parking",    "selected_option": "free", "free_text": None},
        ])
        assert scores["pet_policy"]["answer_count"] == 2
        assert scores["parking"]["answer_count"] == 1

    def test_option_counts_tallied(self):
        scores, *_ = self._run([
            {"gap_category": "pet_policy", "selected_option": "no",  "free_text": None},
            {"gap_category": "pet_policy", "selected_option": "no",  "free_text": None},
            {"gap_category": "pet_policy", "selected_option": "yes_all", "free_text": None},
        ])
        assert scores["pet_policy"]["option_counts"]["no"] == 2
        assert scores["pet_policy"]["option_counts"]["yes_all"] == 1

    def test_free_text_count(self):
        scores, *_ = self._run([
            {"gap_category": "parking", "selected_option": "free", "free_text": "large lot"},
            {"gap_category": "parking", "selected_option": "free", "free_text": None},
        ])
        assert scores["parking"]["free_text_count"] == 1

    def test_empty_answers_produces_empty_scores(self):
        scores, *_ = self._run([])
        assert scores == {}

    # --- upsert mechanics ---

    def test_upsert_property_id_matches(self):
        _, payload, _ = self._run([], property_id="my-prop")
        assert payload["property_id"] == "my-prop"

    def test_upsert_on_conflict_is_property_id(self):
        _, _, kwargs = self._run([])
        assert kwargs.get("on_conflict") == "property_id"

    def test_null_selected_option_not_counted(self):
        scores, *_ = self._run([
            {"gap_category": "spa", "selected_option": None, "free_text": None},
        ])
        assert scores["spa"]["option_counts"] == {}

    def test_multiple_categories_independent(self):
        scores, *_ = self._run([
            {"gap_category": "spa",    "selected_option": "yes_great", "free_text": None},
            {"gap_category": "family", "selected_option": "very",      "free_text": None},
        ])
        assert "spa"    in scores
        assert "family" in scores
        assert scores["spa"]["answer_count"]    == 1
        assert scores["family"]["answer_count"] == 1
