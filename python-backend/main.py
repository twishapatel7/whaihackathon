from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path

import pandas as pd

from routers.answers import router as answers_router
from routers.dashboard import router as dashboard_router
from routers.gaps import router as gaps_router
from routers.properties import router as properties_router

# Load .env file BEFORE reading env vars
load_dotenv()

app = FastAPI()

# Allow CORS for local frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.on_event("startup")
async def _load_dataframes() -> None:
    """
    Load processed CSVs into memory for low-latency API calls.
    Routers expect these on `request.app.state`.
    """
    data_dir = Path(__file__).parent / "data"
    descriptions_path = data_dir / "Description_PROC.csv"
    reviews_path = data_dir / "Reviews_PROC.csv"

    if not descriptions_path.exists():
        raise RuntimeError(f"Missing data file: {descriptions_path}")
    if not reviews_path.exists():
        raise RuntimeError(f"Missing data file: {reviews_path}")

    app.state.descriptions_df = pd.read_csv(descriptions_path)
    app.state.reviews_df = pd.read_csv(reviews_path)


# Register routers
app.include_router(answers_router)
app.include_router(properties_router)
app.include_router(gaps_router)
app.include_router(dashboard_router)
