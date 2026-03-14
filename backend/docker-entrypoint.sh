#!/bin/sh
set -e

echo "[MedCore] Applying database schema (idempotent)..."
python init_db.py

echo "[MedCore] Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
