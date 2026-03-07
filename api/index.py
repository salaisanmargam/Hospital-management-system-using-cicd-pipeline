"""
Vercel serverless entry point for the MedCore FastAPI backend.

Vercel invokes `app` directly as an ASGI application (passing the full
request path, e.g. /api/auth/login).  The _StripApiPrefix middleware
strips the /api prefix so FastAPI sees /auth/login, /health, etc.

`handler` (Mangum) is kept as a fallback for Lambda-style invocation.
"""
import sys
import os
import traceback

# Make the `backend` package importable relative to this file
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

_startup_error: str = ""


class _StripApiPrefix:
    """Thin ASGI middleware that strips a URL prefix before forwarding."""

    def __init__(self, asgi_app, prefix: str = "/api"):
        self._app = asgi_app
        self._prefix = prefix

    async def __call__(self, scope, receive, send):
        if scope.get("type") in ("http", "websocket"):
            path: str = scope.get("path", "")
            if path.startswith(self._prefix):
                scope = dict(scope)
                scope["path"] = path[len(self._prefix):] or "/"
                scope["raw_path"] = scope["path"].encode()
        await self._app(scope, receive, send)


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

    # Vercel ASGI entry-point — strips /api so FastAPI sees /auth/login etc.
    app = _StripApiPrefix(_fastapi_app, "/api")

    # Mangum Lambda-style fallback — api_gateway_base_path handles stripping there
    handler = Mangum(_fastapi_app, lifespan="off", api_gateway_base_path="/api")

except Exception as _err:
    _startup_error = traceback.format_exc()
    print(f"[MedCore] STARTUP ERROR:\n{_startup_error}")

    from fastapi import FastAPI as _FastAPI
    from fastapi.responses import PlainTextResponse as _PR
    from mangum import Mangum as _Mangum

    _fb = _FastAPI()

    @_fb.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def _err_handler(path: str):
        return _PR(_startup_error, status_code=500)

    # Also expose at root for direct checks
    @_fb.api_route("/", methods=["GET", "POST"])
    async def _err_root():
        return _PR(_startup_error, status_code=500)

    app = _fb
    handler = _Mangum(_fb, lifespan="off")

