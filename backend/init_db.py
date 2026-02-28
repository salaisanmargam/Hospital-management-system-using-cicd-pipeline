"""
init_db.py – Apply schema_pg.sql to the Neon PostgreSQL database.

Usage (from the backend/ directory):
    python init_db.py
"""
import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

_script_dir = Path(__file__).resolve().parent
# Load .env from backend/ first, then fall back to project root
load_dotenv(_script_dir / ".env")
load_dotenv(_script_dir.parent / ".env", override=False)


def init_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in .env")

    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = True          # DDL must run outside a transaction in Neon
        cursor = conn.cursor()

        schema_path = _script_dir / "schema_pg.sql"
        with open(schema_path, "r") as f:
            schema = f.read()

        # Split on ; and run each statement, skipping pure-comment chunks
        for statement in schema.split(";"):
            # Strip comment lines, then check if anything remains
            lines = [l for l in statement.splitlines() if not l.strip().startswith("--")]
            stmt = "\n".join(lines).strip()
            if not stmt:
                continue
            try:
                cursor.execute(stmt)
            except psycopg2.Error as err:
                print(f"[Warning] Statement failed: {err}")

        cursor.close()
        conn.close()
        print("✓ Database schema applied successfully (schema_pg.sql → Neon).")
    except psycopg2.Error as err:
        print(f"✗ Connection error: {err}")
        raise


if __name__ == "__main__":
    init_db()

