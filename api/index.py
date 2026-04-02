"""
Vercel serverless entry point
"""
import sys
import os
import traceback
from fastapi import FastAPI as _FastAPI
from fastapi.responses import PlainTextResponse as _PlainTextResponse, JSONResponse as _JSONResponse

_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

app = None
_startup_error = None

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_backend_dir, "..", ".env"))

    try:
        from app.db import init_pool
        init_pool()
    except Exception as exc:
        print(f"[MedCore] DB pool init warning at module load: {exc}")

    from app.main import app as _fastapi_app

    _root = _FastAPI()

    @_root.get("/health")
    async def _root_health():
        return _JSONResponse({"status": "ok"})

    _root.mount("/api", _fastapi_app)
    app = _root

except Exception:
    _startup_error = traceback.format_exc()
    print(f"[MedCore] STARTUP ERROR:\n{_startup_error}")

    _fb = _FastAPI()

    @_fb.get("/health")
    async def _fb_health():
        return _JSONResponse({"status": "error", "message": "Startup failed"}, status_code=500)

    @_fb.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def _err_handler(path: str):
        return _PlainTextResponse(_startup_error, status_code=500)

    app = _fb
