import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_pool
from .routers import (
    appointments,
    auth,
    health,
    patients,
    staff,
    medicines,
    beds,
    lab_tests,
    prescriptions,
    bills,
    audit_logs,
    vitals,
)

# Load .env from backend/ dir first, then fall back to project root
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)
load_dotenv(dotenv_path=_env_path.parent.parent / ".env", override=False)

app = FastAPI(title=os.getenv("APP_NAME", "MedCore API"))

cors_origins = os.getenv("APP_CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_pool()


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(medicines.router)
app.include_router(beds.router)
app.include_router(lab_tests.router)
app.include_router(prescriptions.router)
app.include_router(bills.router)
app.include_router(audit_logs.router)
app.include_router(vitals.router)
