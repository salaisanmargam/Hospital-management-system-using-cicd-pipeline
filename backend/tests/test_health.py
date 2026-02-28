"""
Basic smoke tests for the MedCore FastAPI backend.
These run without a real database by monkeypatching the psycopg2 pool.
"""
import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient, ASGITransport


# -- Fixtures ------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_db_pool():
    """Prevent any real PostgreSQL connection from being established."""
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = lambda s: s
    mock_cursor.__exit__ = MagicMock(return_value=False)
    mock_cursor.fetchone.return_value = None
    mock_cursor.fetchall.return_value = []
    mock_cursor.rowcount = 0

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_conn.__enter__ = lambda s: s
    mock_conn.__exit__ = MagicMock(return_value=False)

    mock_pool = MagicMock()
    mock_pool.getconn.return_value = mock_conn
    mock_pool.putconn = MagicMock()

    with patch("app.db.init_pool", return_value=None), \
         patch("app.db._pool", new=mock_pool):
        yield


@pytest.fixture
def app():
    from app.main import app as _app
    return _app


# -- Tests ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_endpoint_returns_200(app):
    """GET /health should return HTTP 200 without a database connection."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_has_status_field(app):
    """GET /health should return a JSON body with a 'status' key."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    data = response.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_docs_endpoint_accessible(app):
    """OpenAPI docs endpoint should be reachable."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/docs")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_unauthenticated_patients_returns_401(app):
    """Protected routes must reject requests without a JWT."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=False,
    ) as client:
        response = await client.get("/patients/")
    assert response.status_code in (401, 403)
