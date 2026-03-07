"""
Vercel serverless entry point for the MedCore FastAPI backend.
"""
import sys
import os
import traceback

# Make the `backend` package importable relative to this file
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

_startup_error: str = ""

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_backend_dir, ".env"))

    from app.db import init_pool
    try:
        init_pool()
    except Exception as exc:
        print(f"[MedCore] DB pool init warning at cold start: {exc}")

    from app.main import app as _fastapi_app
    from mangum import Mangum

    app = _fastapi_app
    handler = Mangum(_fastapi_app, lifespan="off", api_gateway_base_path="/api")

except Exception as _err:
    _startup_error = traceback.format_exc()
    print(f"[MedCore] STARTUP ERROR:\n{_startup_error}")

    # Fallback: expose a minimal ASGI app that returns the error so it's visible
    from fastapi import FastAPI as _FastAPI
    from mangum import Mangum as _Mangum

    _fallback = _FastAPI()

    @_fallback.get("/{path:path}")
    @_fallback.post("/{path:path}")
    async def _error_handler(path: str):
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(_startup_error, status_code=500)

    app = _fallback
    handler = _Mangum(_fallback, lifespan="off", api_gateway_base_path="/api")
