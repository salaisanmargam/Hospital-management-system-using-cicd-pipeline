"""
Vercel serverless entry point for the MedCore FastAPI backend.

Vercel routes /api/* requests to this file. Starlette's native mount()
strips the /api prefix so FastAPI sees /auth/login, /health, etc.
"""
import sys
import os
import traceback

# Make the `backend` package importable relative to this file
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_backend_dir, ".env"))

    from app.db import init_pool
    try:
        init_pool()
    except Exception as exc:
        print(f"[MedCore] DB pool init warning at cold start: {exc}")

    from app.main import app as _fastapi_app
    from fastapi import FastAPI as _FastAPI

    # Use Starlette's built-in mount() to strip /api before forwarding.
    # When Vercel sends /api/auth/login, _root delegates to _fastapi_app
    # which sees /auth/login — no custom ASGI middleware needed.
    _root = _FastAPI()
    _root.mount("/api", _fastapi_app)
    app = _root

except Exception as _err:
    _startup_error = traceback.format_exc()
    print(f"[MedCore] STARTUP ERROR:\n{_startup_error}")

    from fastapi import FastAPI as _FastAPI
    from fastapi.responses import PlainTextResponse as _PR

    _fb = _FastAPI()

    @_fb.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def _err_handler(path: str):
        return _PR(_startup_error, status_code=500)

    app = _fb
    handler = _Mangum(_fb, lifespan="off")

