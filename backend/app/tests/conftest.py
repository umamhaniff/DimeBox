import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.auth import get_current_user_id

# Mock user UUID for testing
MOCK_USER_ID = UUID("12345678-1234-5678-1234-567812345678")

@pytest.fixture
def mock_db():
    """
    Fixture that provides an AsyncMock representing a database connection.
    Includes support for async transactions.
    """
    db_conn = AsyncMock()
    
    # The transaction method itself is synchronous, returning the context manager
    transaction_mock = MagicMock()
    transaction_mock.__aenter__ = AsyncMock(return_value=transaction_mock)
    transaction_mock.__aexit__ = AsyncMock(return_value=None)
    
    db_conn.transaction = MagicMock(return_value=transaction_mock)
    
    return db_conn

@pytest.fixture
def client(mock_db):
    """
    Fixture that provides a TestClient with dependency overrides.
    Overrides get_db to yield our mock database connection,
    and get_current_user_id to return our mock user UUID.
    """
    async def override_get_db():
        yield mock_db

    def override_get_current_user_id():
        return MOCK_USER_ID

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    
    with TestClient(app) as test_client:
        yield test_client
        
    # Clear overrides after test
    app.dependency_overrides.clear()
