"""
category_discovery.py
---------------------
Discovers gap categories dynamically using two complementary approaches:

1. Clustering-based emergent discovery
   - Embeds reviews with text-embedding-3-small
   - Clusters embeddings with KMeans
   - Labels each cluster with GPT-4o-mini to get a category + guest question

2. Per-property dynamic gap detection
   - Compares the property's own description against discovered cluster topics
   - GPT identifies features the property advertises that reviews don't cover
   - These become additional high-sparsity gap categories

Each returned category dict is compatible with GAP_CATEGORIES and carries:
  id, topic, icon, question, answerOptions, keywords, fields, sparsity_hint

sparsity_hint (0–1):
  - Cluster-based:        1 - (cluster_size / total_reviews)  → small cluster = big gap
  - Property-specific:    0.9  → property claims it, reviews don't cover it

Falls back gracefully to None if OpenAI or sklearn is unavailable.
Results cached in-process for 1 hour.
"""

import asyncio
import json
import logging
import os
import time

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_CACHE_TTL = 3600
_cat_cache: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _cache_get(pid: str) -> list[dict] | None:
    entry = _cat_cache.get(pid)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["categories"]
    return None


def _cache_set(pid: str, categories: list[dict]) -> None:
    _cat_cache[pid] = {"categories": categories, "ts": time.time()}


def cache_invalidate(pid: str) -> None:
    """Bust the category cache for this property (call after new answers arrive)."""
    _cat_cache.pop(pid, None)


# ---------------------------------------------------------------------------
# Step 1 — Embed reviews
# ---------------------------------------------------------------------------

async def _embed_texts(texts: list[str], client) -> np.ndarray | None:
    """
    Embed a list of texts with text-embedding-3-small.
    Returns an (N, 1536) float32 array, or None on failure.
    """
    try:
        resp = await client.embeddings.create(
            model="text-embedding-3-small",
            input=[t[:512] for t in texts],   # keep tokens reasonable
        )
        return np.array([d.embedding for d in resp.data], dtype=np.float32)
    except Exception as exc:
        logger.warning("Embedding call failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Step 2 — Cluster embeddings
# ---------------------------------------------------------------------------

def _cluster(embeddings: np.ndarray, n_clusters: int) -> tuple[np.ndarray, np.ndarray]:
    """
    KMeans clustering.
    Returns (labels array, centroids array).
    """
    from sklearn.cluster import KMeans
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    labels = km.fit_predict(embeddings)
    return labels, km.cluster_centers_


def _pick_k(n_reviews: int) -> int:
    """Heuristic: ~1 cluster per 5 reviews, capped at 8, minimum 2."""
    return max(2, min(8, n_reviews // 5))


# ---------------------------------------------------------------------------
# Step 3 — Label each cluster via GPT
# ---------------------------------------------------------------------------

_LABEL_SYSTEM = (
    "You identify information gaps that future hotel guests CANNOT answer by reading "
    "the hotel website — only a past guest who actually stayed there can answer them. "
    "Questions must satisfy ALL THREE rules:\n"
    "1. Only a past guest can answer it — not findable on the hotel website or brochure.\n"
    "2. About subjective experience or accuracy of claims — not listing features.\n"
    "3. ACTIONABLE for the hotel — the answer must reveal something the hotel can "
    "actually improve. If a topic seems fixed or unchangeable (e.g. rural location, "
    "climate, scenery), do NOT skip it — reframe it toward the nearest hotel-controlled "
    "element. For example: rural location → 'Was the hotel's transport/shuttle service "
    "adequate for getting around?' | noisy area → 'Did the hotel provide enough soundproofing "
    "or noise mitigation?' | remote setting → 'Did the hotel stock enough on-site amenities "
    "so you didn't need to travel far?'\n\n"
    "DIVERSITY RULE: Each question in a batch must use a completely different framing angle. "
    "Choose one angle per question from this list and never repeat an angle:\n"
    "- Accuracy: 'Did [X] match what was advertised?'\n"
    "- Value: 'Was [X] worth the cost?'\n"
    "- Gap: 'What did the hotel fail to provide regarding [X]?'\n"
    "- Surprise: 'What surprised you most about [X]?'\n"
    "- Recommendation: 'Would you recommend this hotel specifically for [X]?'\n"
    "- Comparison: 'How did [X] compare to similar hotels you have stayed at?'\n"
    "Return only valid JSON with no markdown."
)

_LABEL_USER_TMPL = """\
These hotel review excerpts share a common topic:
{reviews}

Follow these steps:

STEP 1 — Identify the topic these reviews share.

STEP 2 — Ask: can the hotel actually change or improve this? If NO (it's a fixed fact \
like location, scenery, climate, or geography), pivot to the nearest thing the hotel \
DOES control that relates to it. Use these transformations as a guide:

  rural / remote location     → Was the hotel's shuttle or transport service adequate?
  scenic views / nature       → Did the rooms assigned actually have the views promoted?
  noisy surroundings          → Did the hotel provide adequate soundproofing or quiet rooms?
  cold / hot climate          → Did the hotel's heating/cooling meet your needs?
  far from city centre        → Did the hotel provide enough on-site so you didn't need to leave?
  outdoor / nature setting    → Were the outdoor facilities maintained and safe to use?

STEP 3 — Pick ONE framing angle for the question. Each category in a batch must use \
a DIFFERENT angle — never repeat one across the set:
  Accuracy | Value | Gap | Surprise | Recommendation | Comparison

STEP 4 — Write 4 answer options that are meaningfully distinct. Must include at least \
one clearly negative option and one "didn't use / not applicable" escape option.

Return JSON:
{{
  "id": "snake_case_id",
  "topic": "Human Readable Name",
  "icon": "single emoji",
  "question": "Specific, experience-based question only a past guest can answer",
  "answerOptions": [
    {{"value": "v1", "label": "Label 1"}},
    {{"value": "v2", "label": "Label 2"}},
    {{"value": "v3", "label": "Label 3"}},
    {{"value": "v4", "label": "Label 4"}}
  ],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}

Return ONLY the JSON object."""


async def _label_cluster(client, reviews: list[str], cluster_idx: int) -> dict | None:
    sample = "\n".join(f"- {r[:200]}" for r in reviews[:4])
    prompt = _LABEL_USER_TMPL.format(reviews=sample)
    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _LABEL_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        parsed: dict = json.loads(resp.choices[0].message.content or "")
        required = {"id", "topic", "icon", "question", "answerOptions", "keywords"}
        if not required.issubset(parsed):
            logger.warning("Cluster %d label missing keys", cluster_idx)
            return None
        if len(parsed["answerOptions"]) < 2:
            return None
        parsed["fields"] = []   # dynamic categories have no fixed DB fields
        return parsed
    except Exception as exc:
        logger.warning("Cluster %d labeling failed: %s", cluster_idx, exc)
        return None


# ---------------------------------------------------------------------------
# Step 4 — Per-property gap discovery from description
# ---------------------------------------------------------------------------

_PROP_SYSTEM = (
    "You identify information gaps between hotel descriptions and guest reviews. "
    "Your goal is to surface things the hotel CLAIMS but guests haven't verified. "
    "Questions must satisfy ALL THREE rules:\n"
    "1. Only a past guest can answer it — not findable on the hotel website.\n"
    "2. About real experience and subjective quality — not whether a feature exists.\n"
    "3. ACTIONABLE for the hotel — the answer must reveal something the hotel can "
    "actually improve. If a claimed feature seems fixed or environmental, reframe toward "
    "what the hotel does to support it. For example: 'tranquil surroundings' → 'Did the "
    "hotel maintain the quiet atmosphere it advertises?' | 'stunning views' → 'Did the "
    "room you were assigned actually have the views the hotel promotes?'\n\n"
    "DIVERSITY RULE: Each question across the full set must use a completely different "
    "framing angle. Pick one angle per category and never repeat an angle:\n"
    "- Accuracy: 'Did [X] match what was advertised?'\n"
    "- Value: 'Was [X] worth the cost?'\n"
    "- Gap: 'What did the hotel fail to provide regarding [X]?'\n"
    "- Surprise: 'What surprised you most about [X]?'\n"
    "- Recommendation: 'Would you recommend this hotel specifically for [X]?'\n"
    "- Comparison: 'How did [X] compare to similar hotels you have stayed at?'\n"
    "Return only valid JSON with no markdown."
)

_PROP_USER_TMPL = """\
Hotel description:
{description}

Topics already covered by guest reviews: {topics}

Identify up to 3 features this hotel explicitly advertises that guests haven't \
verified in reviews. For each, write a question that a future guest could ONLY \
get answered by someone who stayed there — focused on whether the claim held up, \
what the real experience was like, or what the hotel doesn't tell you.

For each gap category you generate, follow these steps:

STEP 1 — Identify the advertised feature that is uncovered by reviews.

STEP 2 — Ask: can the hotel change or improve this? If NO (it's a fixed fact like \
location, scenery, climate), pivot to what the hotel DOES control that relates to it. \
Use these transformations as a guide:

  scenic / tranquil setting   → Did the hotel actually maintain the atmosphere it advertises?
  rural / remote location     → Was the hotel's transport or shuttle service adequate?
  stunning views              → Did the room you were given actually have the advertised views?
  peaceful surroundings       → Did the hotel deliver on the quiet / relaxation it promises?
  nature / outdoor access     → Were the outdoor facilities well-maintained and easy to access?

STEP 3 — Pick ONE framing angle per category. Every category in your response must \
use a DIFFERENT angle — no two questions can ask the same thing in different words:
  Accuracy | Value | Gap | Surprise | Recommendation | Comparison

STEP 4 — Write 4 meaningfully distinct answer options. Include at least one clearly \
negative option and one "didn't experience it" escape option.

Return JSON:
{{
  "categories": [
    {{
      "id": "snake_case_id",
      "topic": "Human Readable Name",
      "icon": "single emoji",
      "question": "Experience-based question only a past guest can answer",
      "answerOptions": [
        {{"value": "v1", "label": "Label 1"}},
        {{"value": "v2", "label": "Label 2"}},
        {{"value": "v3", "label": "Label 3"}},
        {{"value": "v4", "label": "Label 4"}}
      ],
      "keywords": ["kw1", "kw2"],
      "fields": []
    }}
  ]
}}

Provide exactly 4 answer options per category that reflect real experiential \
outcomes (e.g. "exceeded expectations / as advertised / overhyped / didn't experience it"). \
Return ONLY the JSON object."""


async def _discover_property_specific(
    client,
    property_desc: str,
    cluster_topics: list[str],
) -> list[dict]:
    if not property_desc or pd.isna(property_desc):
        return []
    topics_str = ", ".join(cluster_topics) if cluster_topics else "none found"
    prompt = _PROP_USER_TMPL.format(
        description=str(property_desc)[:800],
        topics=topics_str,
    )
    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _PROP_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        parsed: dict = json.loads(resp.choices[0].message.content or "")
        cats = parsed.get("categories", [])
        required = {"id", "topic", "icon", "question", "answerOptions", "keywords"}
        valid = []
        for c in cats:
            if required.issubset(c) and len(c.get("answerOptions", [])) >= 2:
                c.setdefault("fields", [])
                valid.append(c)
        return valid
    except Exception as exc:
        logger.warning("Property-specific gap discovery failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def discover_categories(
    property_id: str | int,
    descriptions_df: pd.DataFrame,
    reviews_df: pd.DataFrame,
) -> list[dict] | None:
    """
    Main entry point.

    Returns a list of dynamically discovered gap categories, each with an
    extra `sparsity_hint` field (0–1) that gap_detector uses instead of
    field_sparsity when dynamic categories are present.

    Returns None if discovery fails so the caller can fall back to the
    hardcoded GAP_CATEGORIES.
    """
    from services.nlp_analyzer import _extract_review_texts

    pid = str(property_id)

    cached = _cache_get(pid)
    if cached is not None:
        return cached

    # --- Check OpenAI is available ---
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set; skipping dynamic category discovery")
        return None

    try:
        from openai import AsyncOpenAI
    except ImportError:
        logger.warning("openai package not installed; skipping dynamic category discovery")
        return None

    client = AsyncOpenAI(api_key=api_key)

    # --- Get review texts ---
    texts = _extract_review_texts(pid, reviews_df)
    if len(texts) < 5:
        logger.info("Property %s has too few reviews (%d) for clustering", pid, len(texts))
        return None

    # --- Get property description ---
    id_col = next(
        (c for c in descriptions_df.columns
         if "property_id" in c.lower() or c.lower() in ("id", "eg_property_id")),
        None,
    )
    desc_col = next(
        (c for c in descriptions_df.columns if "description" in c.lower()),
        None,
    )
    property_desc = None
    if id_col and desc_col:
        matches = descriptions_df[descriptions_df[id_col].astype(str) == pid]
        if not matches.empty:
            property_desc = matches.iloc[0].get(desc_col)

    # --- Embed reviews ---
    embeddings = await _embed_texts(texts, client)
    if embeddings is None:
        return None

    # --- Cluster ---
    k = _pick_k(len(texts))
    try:
        labels, _ = _cluster(embeddings, k)
    except Exception as exc:
        logger.warning("Clustering failed for property %s: %s", pid, exc)
        return None

    # Group reviews by cluster, sorted largest → smallest
    clusters: dict[int, list[str]] = {}
    for text, label in zip(texts, labels.tolist()):
        clusters.setdefault(label, []).append(text)
    sorted_clusters = sorted(clusters.items(), key=lambda x: len(x[1]), reverse=True)
    total_reviews = len(texts)

    # --- Label all clusters concurrently ---
    label_tasks = [
        _label_cluster(client, reviews, idx)
        for idx, reviews in sorted_clusters
    ]
    labeled: list[dict | None] = await asyncio.gather(*label_tasks)

    cluster_categories: list[dict] = []
    for (cluster_idx, reviews), cat in zip(sorted_clusters, labeled):
        if cat is None:
            continue
        # sparsity_hint: small cluster = rarely discussed = bigger gap
        cat["sparsity_hint"] = round(1.0 - len(reviews) / total_reviews, 4)
        cluster_categories.append(cat)

    if not cluster_categories:
        logger.warning("All cluster labelings failed for property %s", pid)
        return None

    # --- Property-specific gap discovery ---
    cluster_topics = [c["topic"] for c in cluster_categories]
    prop_gaps = await _discover_property_specific(client, property_desc, cluster_topics)
    for gap in prop_gaps:
        gap["sparsity_hint"] = 0.9   # property advertises it, reviews don't cover it

    # --- Merge, deduplicate by id ---
    seen: set[str] = set()
    all_categories: list[dict] = []
    for cat in cluster_categories + prop_gaps:
        if cat["id"] not in seen:
            seen.add(cat["id"])
            all_categories.append(cat)

    if not all_categories:
        return None

    _cache_set(pid, all_categories)
    logger.info(
        "Discovered %d dynamic categories for property %s (%d cluster, %d property-specific)",
        len(all_categories), pid, len(cluster_categories), len(prop_gaps),
    )
    return all_categories
