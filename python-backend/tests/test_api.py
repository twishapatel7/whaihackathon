"""
tests/test_api.py
-----------------
Automated tests for the Gap Intelligence API.
Run with:  pytest tests/ -v
"""

import math
import sys
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

# Make sure the backend package root is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app

DATA_DIR = Path(__file__).parent.parent / "data"

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def real_descriptions_df():
    return pd.read_csv(DATA_DIR / "Description_PROC.csv", low_memory=False)


@pytest.fixture(scope="session")
def real_reviews_df():
    return pd.read_csv(DATA_DIR / "Reviews_PROC.csv", low_memory=False)


@pytest.fixture(scope="session")
def client(real_descriptions_df, real_reviews_df):
    """TestClient with real CSVs pre-loaded into app.state."""
    app.state.descriptions_df = real_descriptions_df
    app.state.reviews_df = real_reviews_df
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def first_property_id(real_descriptions_df):
    id_col = next(c for c in real_descriptions_df.columns if "property_id" in c.lower())
    return str(real_descriptions_df[id_col].iloc[0])


# ---------------------------------------------------------------------------
# 1. Health / root
# ---------------------------------------------------------------------------

class TestHealth:
    def test_root_returns_200(self, client):
        r = client.get("/")
        assert r.status_code == 200

    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# 2. GET /properties
# ---------------------------------------------------------------------------

class TestProperties:
    def test_returns_list(self, client):
        r = client.get("/properties")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_returns_13_properties(self, client):
        data = client.get("/properties").json()
        assert len(data) == 13

    def test_property_shape(self, client):
        prop = client.get("/properties").json()[0]
        assert "propertyId" in prop
        assert "name" in prop
        assert "starRating" in prop
        assert "city" in prop
        assert "country" in prop

    def test_property_ids_are_strings(self, client):
        props = client.get("/properties").json()
        for p in props:
            assert isinstance(p["propertyId"], str)
            assert len(p["propertyId"]) > 0

    def test_names_are_not_unknown(self, client):
        props = client.get("/properties").json()
        for p in props:
            assert p["name"] != "Unknown", f"Property {p['propertyId']} has no name"


# ---------------------------------------------------------------------------
# 3. GET /gaps/{property_id}
# ---------------------------------------------------------------------------

class TestGaps:
    def test_known_property_returns_200(self, client, first_property_id):
        r = client.get(f"/gaps/{first_property_id}")
        assert r.status_code == 200

    def test_unknown_property_returns_404(self, client):
        r = client.get("/gaps/nonexistent-property-xyz")
        assert r.status_code == 404

    def test_returns_list(self, client, first_property_id):
        data = client.get(f"/gaps/{first_property_id}").json()
        assert isinstance(data, list)

    def test_returns_at_most_4_gaps(self, client, first_property_id):
        data = client.get(f"/gaps/{first_property_id}").json()
        assert 1 <= len(data) <= 4

    def test_gap_shape(self, client, first_property_id):
        gap = client.get(f"/gaps/{first_property_id}").json()[0]
        assert "id" in gap
        assert "topic" in gap
        assert "icon" in gap
        assert "urgency" in gap
        assert "question" in gap
        assert "answerOptions" in gap
        assert "score" in gap

    def test_gap_score_is_0_to_1(self, client, first_property_id):
        gaps = client.get(f"/gaps/{first_property_id}").json()
        for g in gaps:
            assert 0.0 <= g["score"] <= 1.0, f"score out of range: {g['score']}"

    def test_gaps_sorted_descending(self, client, first_property_id):
        gaps = client.get(f"/gaps/{first_property_id}").json()
        scores = [g["score"] for g in gaps]
        assert scores == sorted(scores, reverse=True)

    def test_urgency_values(self, client, first_property_id):
        gaps = client.get(f"/gaps/{first_property_id}").json()
        for g in gaps:
            assert g["urgency"] in ("High", "Moderate")

    def test_urgency_threshold(self, client, first_property_id):
        gaps = client.get(f"/gaps/{first_property_id}").json()
        for g in gaps:
            if g["score"] > 0.65:
                assert g["urgency"] == "High"
            else:
                assert g["urgency"] == "Moderate"

    def test_answer_options_non_empty(self, client, first_property_id):
        gaps = client.get(f"/gaps/{first_property_id}").json()
        for g in gaps:
            assert len(g["answerOptions"]) > 0
            for opt in g["answerOptions"]:
                assert "value" in opt
                assert "label" in opt

    def test_all_properties_return_gaps(self, client, real_descriptions_df):
        id_col = next(c for c in real_descriptions_df.columns if "property_id" in c.lower())
        for pid in real_descriptions_df[id_col].astype(str):
            r = client.get(f"/gaps/{pid}")
            assert r.status_code == 200, f"Failed for property {pid}"
            assert len(r.json()) > 0


# ---------------------------------------------------------------------------
# 4. Placeholder routers
# ---------------------------------------------------------------------------

class TestPlaceholders:
    def test_answers_post_exists(self, client):
        # GET is gone; POST /answers is the real endpoint (tested in test_answers.py)
        r = client.get("/answers")
        assert r.status_code == 405   # Method Not Allowed

    def test_dashboard_ok(self, client):
        assert client.get("/dashboard").json()["status"] == "ok"


# ---------------------------------------------------------------------------
# 5. Unit tests — nlp_analyzer
# ---------------------------------------------------------------------------

class TestNlpAnalyzer:
    from services import nlp_analyzer  # imported here to avoid module-level side-effects

    def test_returns_all_categories(self, real_reviews_df, first_property_id):
        from services.nlp_analyzer import compute_entropy_scores, GAP_KEYWORDS
        scores = compute_entropy_scores(first_property_id, real_reviews_df)
        assert set(scores.keys()) == set(GAP_KEYWORDS.keys())

    def test_scores_sum_to_1(self, real_reviews_df, first_property_id):
        from services.nlp_analyzer import compute_entropy_scores
        scores = compute_entropy_scores(first_property_id, real_reviews_df)
        assert abs(sum(scores.values()) - 1.0) < 1e-6

    def test_scores_non_negative(self, real_reviews_df, first_property_id):
        from services.nlp_analyzer import compute_entropy_scores
        scores = compute_entropy_scores(first_property_id, real_reviews_df)
        for cat, val in scores.items():
            assert val >= 0.0, f"{cat} score is negative"

    def test_empty_reviews_gives_uniform(self):
        from services.nlp_analyzer import compute_entropy_scores, GAP_KEYWORDS
        empty = pd.DataFrame(columns=["eg_property_id", "review_text"])
        scores = compute_entropy_scores("fake_id", empty)
        expected = 1.0 / len(GAP_KEYWORDS)
        for v in scores.values():
            assert abs(v - expected) < 1e-6


# ---------------------------------------------------------------------------
# 6. Unit tests — gap_detector
# ---------------------------------------------------------------------------

class TestGapDetector:
    def test_returns_top_4(self, real_descriptions_df, real_reviews_df, first_property_id):
        from services.gap_detector import detect_gaps
        gaps = detect_gaps(first_property_id, real_descriptions_df, real_reviews_df)
        assert len(gaps) == 4

    def test_sorted_descending(self, real_descriptions_df, real_reviews_df, first_property_id):
        from services.gap_detector import detect_gaps
        gaps = detect_gaps(first_property_id, real_descriptions_df, real_reviews_df)
        scores = [g["score"] for g in gaps]
        assert scores == sorted(scores, reverse=True)

    def test_unknown_property_returns_gaps_anyway(self, real_descriptions_df, real_reviews_df):
        from services.gap_detector import detect_gaps
        # Should not raise; returns gaps based on entropy alone
        gaps = detect_gaps("not-a-real-id", real_descriptions_df, real_reviews_df)
        assert isinstance(gaps, list)

    def test_field_sparsity_fully_null(self):
        from services.gap_detector import _field_sparsity
        row = pd.Series({"some_col": None})
        assert _field_sparsity(row, ["missing_col1", "missing_col2"]) == 1.0

    def test_field_sparsity_fully_populated(self):
        from services.gap_detector import _field_sparsity
        row = pd.Series({"pet_policy": "No pets"})
        assert _field_sparsity(row, ["pet_policy"]) == 0.0
