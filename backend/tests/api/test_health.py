"""
Tests for health check endpoints adhering to PRD Section 15.9.
"""

from unittest.mock import patch, MagicMock


def test_root_health_check_healthy(client):
    with patch("backend.app.api.health.SessionLocal") as mock_session_factory:
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "ok"
        assert "environment" in data
        assert "version" in data
        assert "X-Request-ID" in response.headers


def test_api_health_check_degraded(client):
    with patch("backend.app.api.health.SessionLocal") as mock_session_factory:
        mock_session_factory.side_effect = Exception("DB Connection refused")

        response = client.get("/api/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unavailable"
