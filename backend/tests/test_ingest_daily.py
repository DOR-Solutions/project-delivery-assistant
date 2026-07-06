import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT.parent) not in sys.path:
    sys.path.insert(0, str(ROOT.parent))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    sys.modules.pop("backend.app.main", None)
    sys.modules.pop("backend.app.database", None)
    from backend.app.main import app

    with TestClient(app) as test_client:
        yield test_client


def test_daily_ingest_is_idempotent_and_updates_ops(client):
    payload = {
        "project_id": "t5-baggage-programme",
        "source_ref": "daily-upload.json",
        "bag_days": [
            {
                "date": "2026-07-01",
                "series": "throughput",
                "planned": 1000,
                "actual": 950,
                "capacity": 1100,
                "day_type": "A",
                "breakdown": {"zone": "screening"},
            }
        ],
        "risks": [
            {
                "title": "New risk",
                "area": "HBS3",
                "likelihood": 3,
                "impact": 4,
                "status": "open",
            }
        ],
        "report_snapshots": [
            {
                "date": "2026-07-01",
                "completion_pct": 62,
                "rag": "amber",
                "data": {"summary": "daily update"},
            }
        ],
        "work_log": [
            {
                "date": "2026-07-01",
                "activity": "Install checks",
                "area": "001",
                "pct": 35,
                "contractor": "VI",
            }
        ],
        "milestones": [
            {
                "date": "2026-07-01",
                "title": "First milestone",
                "status": "in_progress",
                "detail": "Ready for review",
                "on_track": True,
            }
        ],
    }

    first = client.post("/api/ingest/daily", json=payload)
    assert first.status_code == 200
    first_body = first.json()
    assert first_body["stored"]["bag_days"] == 1
    assert first_body["stored"]["risks"] == 1
    assert first_body["stored"]["report_snapshots"] == 1
    assert first_body["stored"]["work_log"] == 1
    assert first_body["stored"]["milestones"] == 1

    second = client.post("/api/ingest/daily", json=payload)
    assert second.status_code == 200
    second_body = second.json()
    assert second_body["stored"]["bag_days"] == 1
    assert second_body["stored"]["risks"] == 1
    assert second_body["stored"]["report_snapshots"] == 1
    assert second_body["stored"]["work_log"] == 1
    assert second_body["stored"]["milestones"] == 1

    summary = client.get("/api/ops/summary", params={"project_id": "t5-baggage-programme"})
    assert summary.status_code == 200
    body = summary.json()
    assert body["throughput"][-1]["planned"] == 1000
    assert body["throughput"][-1]["actual"] == 950
    assert body["milestones"]["items"][0]["title"] == "First milestone"
