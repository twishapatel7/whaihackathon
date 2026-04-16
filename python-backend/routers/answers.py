import logging
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/answers", tags=["answers"])


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class AnswerItem(BaseModel):
    gapCategory: str
    selectedOption: Optional[str] = None
    freeText: Optional[str] = None


class SubmitAnswersRequest(BaseModel):
    sessionId: str
    propertyId: str
    inputMode: str = "text"          # "text" or "voice"
    starRating: Optional[int] = None
    reviewText: Optional[str] = None
    answers: list[AnswerItem]


# ---------------------------------------------------------------------------
# Gap-scores cache helper
# ---------------------------------------------------------------------------

def update_gap_scores_cache(property_id: str) -> None:
    """
    Recompute per-category answer statistics from gap_answers and upsert
    the result into gap_scores_cache.

    Runs in a background thread so it doesn't block the response.
    """
    # Lazy import so the API can start even if Supabase deps aren't installed
    # (e.g. when only using /gaps endpoints locally).
    from services.supabase_client import supabase

    rows = (
        supabase.table("gap_answers")
        .select("gap_category, selected_option, free_text")
        .eq("property_id", property_id)
        .execute()
        .data
    )

    category_stats: dict[str, dict] = defaultdict(
        lambda: {"answer_count": 0, "option_counts": defaultdict(int), "free_text_count": 0}
    )

    for row in rows:
        cat = row["gap_category"]
        category_stats[cat]["answer_count"] += 1
        if row.get("selected_option"):
            category_stats[cat]["option_counts"][row["selected_option"]] += 1
        if row.get("free_text"):
            category_stats[cat]["free_text_count"] += 1

    # Convert defaultdicts to plain dicts for JSON serialisation
    scores = {
        cat: {
            "answer_count": stats["answer_count"],
            "option_counts": dict(stats["option_counts"]),
            "free_text_count": stats["free_text_count"],
        }
        for cat, stats in category_stats.items()
    }

    supabase.table("gap_scores_cache").upsert(
        {"property_id": property_id, "scores": scores},
        on_conflict="property_id",
    ).execute()


# ---------------------------------------------------------------------------
# POST /answers
# ---------------------------------------------------------------------------

@router.post("")
async def submit_answers(body: SubmitAnswersRequest, background_tasks: BackgroundTasks):
    try:
        # Lazy import so the module can load without Supabase installed.
        from services.supabase_client import supabase

        # 1. Insert review session
        supabase.table("review_sessions").insert({
            "session_id":  body.sessionId,
            "property_id": body.propertyId,
            "input_mode":  body.inputMode,
            "star_rating": body.starRating,
            "review_text": body.reviewText,
        }).execute()

        # 2. Insert one row per answer
        if body.answers:
            supabase.table("gap_answers").insert([
                {
                    "session_id":       body.sessionId,
                    "property_id":      body.propertyId,
                    "gap_category":     a.gapCategory,
                    "selected_option":  a.selectedOption,
                    "free_text":        a.freeText,
                }
                for a in body.answers
            ]).execute()

    except Exception as exc:
        logger.exception("Supabase write failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # 3. Recompute gap scores cache in the background
    background_tasks.add_task(update_gap_scores_cache, body.propertyId)

    return {"success": True, "pointsEarned": len(body.answers) * 50}
