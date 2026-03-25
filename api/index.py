"""
Vercel serverless entry point — routes /api/* to the FastAPI backend.

Vercel invokes `app` (an ASGI application) for every request matching
/api/*.  Starlette's built-in mount() strips the /api prefix so FastAPI
sees plain paths: /auth/login, /health, etc.

Development: run `uvicorn app.main:app --reload` from the backend/ dir.
"""
import sys
import os
import traceback
from fastapi import FastAPI as _FastAPI

# Vercel expects a top-level ASGI symbol named `app`.
app = _FastAPI()

# Make the `backend` package importable relative to this file.
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

try:
    from dotenv import load_dotenv
    # In production (Vercel) there is no .env file — env vars are injected
    # by the platform.  In local development this loads backend/../.env.
    load_dotenv(os.path.join(_backend_dir, "..", ".env"))

    from app.db import init_pool
    try:
        init_pool()
    except Exception as exc:
        # Non-fatal: pool is created lazily on the first request.
        print(f"[MedCore] DB pool init warning at cold start: {exc}")

    from app.main import app as _fastapi_app

    # Mount the FastAPI app at /api so Starlette strips the prefix
    # before forwarding: /api/auth/login → /auth/login.
    _root = _FastAPI()
    _root.mount("/api", _fastapi_app)
    app = _root

except Exception:
    # If startup fails (e.g. missing dependency), return the traceback as
    # a plain-text 500 so the error is visible instead of a cryptic
    # FUNCTION_INVOCATION_FAILED.
    _startup_error = traceback.format_exc()
    print(f"[MedCore] STARTUP ERROR:\n{_startup_error}")

    from fastapi.responses import PlainTextResponse as _PR

    _fb = _FastAPI()

    @_fb.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def _err_handler(path: str):
        return _PR(_startup_error, status_code=500)

    app = _fb

