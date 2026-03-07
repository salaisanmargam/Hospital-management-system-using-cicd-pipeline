import os
from pathlib import Path

from dotenv import load_dotenv

# ── Load .env BEFORE any app imports so module-level constants (e.g.
#    JWT_EXPIRE_MINUTES in auth.py) pick up the correct values. ──────────────
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)
load_dotenv(dotenv_path=_env_path.parent.parent / ".env", override=False)

from contextlib import asynccontextmanager  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .db import init_pool  # noqa: E402
from .routers import (  # noqa: E402
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

@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    try:
        init_pool()
    except Exception as exc:  # pragma: no cover
        # Non-fatal: the pool will be lazily created on the first request.
        print(f"[MedCore] DB pool init failed at startup (non-fatal): {exc}")
    yield


app = FastAPI(title=os.getenv("APP_NAME", "MedCore API"), lifespan=lifespan)

cors_origins = os.getenv("APP_CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
