import os

from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

_pool: ThreadedConnectionPool | None = None


def init_pool() -> None:
    """Initialise the PostgreSQL connection pool from DATABASE_URL."""
    global _pool
    if _pool is not None:
        return
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Set it to your Neon PostgreSQL connection string."
        )
    try:
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=int(os.getenv("DB_POOL_SIZE", "5")),
            dsn=database_url,
        )
        print("[MedCore] PostgreSQL connection pool initialised.")
    except Exception as e:
        print(f"[MedCore] Error initialising PostgreSQL pool: {e}")
        raise


def dict_cursor(conn):
    """Return a cursor whose rows are returned as dicts (RealDictCursor)."""
    return conn.cursor(cursor_factory=RealDictCursor)


def get_conn():
    """FastAPI dependency – yields a pooled connection and returns it on teardown."""
    if _pool is None:
        init_pool()
    assert _pool is not None
    conn = _pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
