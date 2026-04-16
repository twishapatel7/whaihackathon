"""
db_cache.py
-----------
Persistent Supabase cache for the expensive OpenAI gap computation pipeline
(embeddings → clustering → GPT labeling → entropy scoring).

Cache hierarchy
  L1 — in-process Python dicts in category_discovery.py / nlp_analyzer.py
       TTL: 1 hour  |  survives for the life of the server process
  L2 — Supabase table `gap_computation_cache`  (this module)
       TTL: 24 hours  |  survives server restarts, shared across instances

Read path  (called by gaps.py before running the pipeline):
  1. Check L2 — if a fresh row exists (computed_at within 24h), return it.
  2. If stale or missing, return None → caller runs the full pipeline.

Write path (called by gaps.py after the pipeline finishes):
  Upsert categories + entropy_scores + final gaps into the Supabase row.

Invalidation:
  POST /gaps/refresh/{property_id} calls db_cache_invalidate() to delete
  the Supabase row, forcing a full recompute on the next GET.
"""

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24


def _supabase():
    """Lazy import so the module loads even without Supabase credentials."""
    from services.supabase_client import supabase
    return supabase


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def db_cache_get(property_id: str) -> dict | None:
    """
    Return cached computation for *property_id* if it exists and is fresh
    (computed within the last 24 hours), otherwise return None.

    Returns a dict with keys: categories, entropy_scores, gaps
    """
    try:
        row = (
            _supabase()
            .table("gap_computation_cache")
            .select("categories, entropy_scores, gaps, computed_at")
            .eq("property_id", property_id)
            .maybe_single()
            .execute()
            .data
        )
    except Exception as exc:
        logger.warning("db_cache_get failed for %s: %s", property_id, exc)
        return None

    if row is None:
        return None

    computed_at_str = row.get("computed_at")
    if not computed_at_str:
        return None

    try:
        computed_at = datetime.fromisoformat(computed_at_str.replace("Z", "+00:00"))
        age = datetime.now(timezone.utc) - computed_at
        if age > timedelta(hours=CACHE_TTL_HOURS):
            logger.info("db_cache stale for %s (age: %s)", property_id, age)
            return None
    except Exception as exc:
        logger.warning("db_cache timestamp parse failed for %s: %s", property_id, exc)
        return None

    logger.info("db_cache hit for property %s", property_id)
    return {
        "categories":     row.get("categories"),
        "entropy_scores": row.get("entropy_scores"),
        "gaps":           row.get("gaps"),
    }


def db_cache_set(
    property_id: str,
    categories: list[dict] | None,
    entropy_scores: dict[str, float],
    gaps: list[dict],
) -> None:
    """
    Upsert the computed results for *property_id* into Supabase.
    Silently logs and continues on failure — a cache write error should
    never break the API response.
    """
    try:
        _supabase().table("gap_computation_cache").upsert(
            {
                "property_id":    property_id,
                "categories":     categories,
                "entropy_scores": entropy_scores,
                "gaps":           gaps,
                "computed_at":    datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="property_id",
        ).execute()
        logger.info("db_cache written for property %s", property_id)
    except Exception as exc:
        logger.warning("db_cache_set failed for %s: %s", property_id, exc)


def db_cache_invalidate(property_id: str) -> None:
    """
    Delete the cached row for *property_id* so the next GET forces a
    full recompute. Called by POST /gaps/refresh/{property_id}.
    """
    try:
        _supabase().table("gap_computation_cache").delete().eq(
            "property_id", property_id
        ).execute()
        logger.info("db_cache invalidated for property %s", property_id)
    except Exception as exc:
        logger.warning("db_cache_invalidate failed for %s: %s", property_id, exc)
