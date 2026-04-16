from fastapi import APIRouter, HTTPException, Request

from services.category_discovery import (
    cache_invalidate as categories_cache_invalidate,
    discover_categories,
)
from services.db_cache import db_cache_get, db_cache_invalidate, db_cache_set
from services.gap_detector import GAP_CATEGORIES, detect_gaps
from services.nlp_analyzer import analyze_reviews_with_openai
from services.nlp_analyzer import cache_invalidate as entropy_cache_invalidate

router = APIRouter(prefix="/gaps", tags=["gaps"])


def _get_property_ids(descriptions_df) -> list[str]:
    id_col = next(
        (c for c in descriptions_df.columns
         if "property_id" in c.lower() or c.lower() in ("id", "eg_property_id")),
        None,
    )
    return descriptions_df[id_col].astype(str).tolist() if id_col else []


async def _compute_gaps(property_id: str, descriptions_df, reviews_df) -> list[dict]:
    """
    Full pipeline — only runs when there is no valid L2 cache entry:
      1. Discover dynamic categories via clustering + per-property GPT analysis.
      2. Score entropy for the active category set (OpenAI or keyword fallback).
      3. Compute ranked gap scores.
      4. Persist results to Supabase (L2 cache, 24-hour TTL).
    Falls back to hardcoded GAP_CATEGORIES if discovery fails.
    """
    # Step 1 — dynamic category discovery
    dynamic_categories = await discover_categories(
        property_id, descriptions_df, reviews_df
    )

    # Step 2 — entropy scoring against the active category set
    entropy_scores = await analyze_reviews_with_openai(
        property_id, reviews_df, GAP_CATEGORIES,
        dynamic_categories=dynamic_categories,
    )

    # Step 3 — compute gap scores
    gaps = detect_gaps(
        property_id, descriptions_df, reviews_df,
        entropy_scores_override=entropy_scores,
        dynamic_categories=dynamic_categories or None,
    )

    # Step 4 — persist to Supabase so the next request skips all of the above
    db_cache_set(property_id, dynamic_categories, entropy_scores, gaps)

    return gaps


# ---------------------------------------------------------------------------
# GET /gaps/{property_id}
# ---------------------------------------------------------------------------

@router.get("/{property_id}")
async def get_gaps(property_id: str, request: Request):
    """
    Return up to 4 highest-information-gain gap categories for a property.

    Cache hierarchy:
      L1 — in-process memory (1 hour TTL, lives in category_discovery + nlp_analyzer)
      L2 — Supabase gap_computation_cache (24 hour TTL, persists across restarts)

    Full pipeline (only runs on cold start or after /refresh):
      1. Embed reviews → KMeans cluster → GPT-label each cluster
      2. Compare property description against clusters → per-property gaps
      3. Entropy scoring for all categories
      4. Combine sparsity_hint + entropy → ranked gap scores
    Falls back to hardcoded GAP_CATEGORIES if any step fails.
    """
    descriptions_df = request.app.state.descriptions_df
    reviews_df      = request.app.state.reviews_df

    if property_id not in _get_property_ids(descriptions_df):
        raise HTTPException(status_code=404, detail=f"Property '{property_id}' not found")

    # L2 cache check — return persisted result if fresh (< 24h)
    cached = db_cache_get(property_id)
    if cached and cached.get("gaps"):
        return cached["gaps"]

    # Cache miss — run the full pipeline and persist
    return await _compute_gaps(property_id, descriptions_df, reviews_df)


# ---------------------------------------------------------------------------
# POST /gaps/refresh/{property_id}
# ---------------------------------------------------------------------------

@router.post("/refresh/{property_id}")
async def refresh_gaps(property_id: str, request: Request):
    """
    Bust all caches for this property and force a full recompute.
    Call this after new answers are submitted so the next GET reflects them.

    Clears:
      - Supabase gap_computation_cache row  (L2)
      - In-process category discovery cache (L1)
      - In-process entropy score cache      (L1)
    """
    descriptions_df = request.app.state.descriptions_df
    reviews_df      = request.app.state.reviews_df

    if property_id not in _get_property_ids(descriptions_df):
        raise HTTPException(status_code=404, detail=f"Property '{property_id}' not found")

    # Bust L2 (Supabase) and L1 (in-process) caches
    db_cache_invalidate(property_id)
    categories_cache_invalidate(property_id)
    entropy_cache_invalidate(property_id)

    gaps = await _compute_gaps(property_id, descriptions_df, reviews_df)
    return {"refreshed": True, "gaps": gaps}
