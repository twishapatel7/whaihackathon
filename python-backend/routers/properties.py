import re

import pandas as pd
from fastapi import APIRouter, Request

router = APIRouter(prefix="/properties", tags=["properties"])

_COL_MAP = {
    "property_id":  ["eg_property_id", "property_id", "id", "hotel_id"],
    "name":         ["name", "hotel_name", "property_name", "title"],
    "star_rating":  ["star_rating", "stars", "rating", "starRating"],
    "city":         ["city", "location_city"],
    "country":      ["country", "location_country"],
    "description":  ["property_description", "description", "desc"],
}


def _find_col(df_columns: list[str], candidates: list[str]) -> str | None:
    lower = [c.lower() for c in df_columns]
    for cand in candidates:
        if cand.lower() in lower:
            return df_columns[lower.index(cand.lower())]
    return None


def _name_from_description(desc: str) -> str:
    """
    Extract the lead summary line from property_description.
    e.g. "Suburban resort with 3 restaurants, near butterfly pavilion"
    The text before the first <br> is a human-readable one-liner.
    Strip |MASK| tokens and title-case.
    """
    if not desc or pd.isna(desc):
        return "Unknown"
    # Take everything before the first <br>
    first_line = re.split(r"<br\s*/?>", str(desc), maxsplit=1)[0].strip()
    # Remove |MASK| placeholders
    first_line = re.sub(r"\|MASK\|", "", first_line).strip()
    # Collapse extra whitespace
    first_line = re.sub(r"\s{2,}", " ", first_line)
    # Title-case and cap length
    return first_line.title()[:80] if first_line else "Unknown"


@router.get("")
async def list_properties(request: Request):
    """Return all properties with basic metadata."""
    df = request.app.state.descriptions_df
    cols = df.columns.tolist()

    id_col      = _find_col(cols, _COL_MAP["property_id"])
    name_col    = _find_col(cols, _COL_MAP["name"])
    rating_col  = _find_col(cols, _COL_MAP["star_rating"])
    city_col    = _find_col(cols, _COL_MAP["city"])
    country_col = _find_col(cols, _COL_MAP["country"])
    desc_col    = _find_col(cols, _COL_MAP["description"])

    properties = []
    for _, row in df.iterrows():
        # Prefer an explicit name column; fall back to description summary
        if name_col and not pd.isna(row.get(name_col)) and str(row[name_col]).strip():
            name = str(row[name_col]).strip()
        elif desc_col:
            name = _name_from_description(row.get(desc_col))
        else:
            name = "Unknown"

        properties.append({
            "propertyId": str(row[id_col]) if id_col else None,
            "name":       name,
            "starRating": float(row[rating_col]) if rating_col and not pd.isna(row.get(rating_col)) else None,
            "city":       str(row[city_col])     if city_col    else None,
            "country":    str(row[country_col])  if country_col else None,
        })

    return properties
