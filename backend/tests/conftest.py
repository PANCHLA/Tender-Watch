import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    # Setup test client
    with TestClient(app) as client:
        yield client
