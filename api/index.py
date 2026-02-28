"""
Vercel serverless entry point for the MedCore FastAPI backend.

Vercel's Python runtime executes this file as an AWS Lambda-style handler.
The /api/* route in vercel.json forwards all requests here via Mangum,
which adapts the ASGI FastAPI app to the Lambda event/context interface.
"""
import sys
import os

# Make the `backend` package importable relative to this file
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

# Load .env from the backend directory (no-op in production; env vars come from Vercel settings)
from dotenv import load_dotenv  # noqa: E402
load_dotenv(os.path.join(_backend_dir, ".env"))

# Eagerly initialise the DB connection pool on cold-start
from app.db import init_pool  # noqa: E402
try:
    init_pool()
except Exception as exc:
    # Non-fatal: each request will retry the lazy init path
    print(f"[MedCore] DB pool init warning at cold start: {exc}")

# Import the FastAPI application
from app.main import app as _fastapi_app  # noqa: E402

# Wrap with Mangum so Vercel's Python runtime can forward HTTP events
from mangum import Mangum  # noqa: E402

# `app` is detected by Vercel as the ASGI entry-point (fallback)
app = _fastapi_app

# `handler` is the Lambda-style entry-point used by Vercel's Python runtime
# api_gateway_base_path strips the /api prefix so FastAPI sees /patients, /auth etc.
handler = Mangum(_fastapi_app, lifespan="off", api_gateway_base_path="/api")
