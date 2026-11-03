import hashlib
import hmac
import time

import pytest
from fastapi.testclient import TestClient

from ritm_api.main import Settings, create_app

BOT_TOKEN = "123456:TEST-TOKEN"


@pytest.fixture
def app(tmp_path):
    return create_app(Settings(db_path=str(tmp_path / "t.db"), telegram_bot_token=BOT_TOKEN, telegram_bot_name="ritm_test_bot", cookie_secure=False))


@pytest.fixture
def client(app):
    return TestClient(app)


def register(client, username="alice", password="secret123"):
    return client.post("/api/auth/register", json={"username": username, "password": password})


def telegram_payload(tg_id=42, username="tg_alice", auth_date=None, token=BOT_TOKEN):
    data = {"id": tg_id, "first_name": "Alice", "username": username, "auth_date": auth_date or int(time.time())}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hashlib.sha256(token.encode()).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return data


RESULT = {"mode": "lit", "lang": "ru", "cpm": 250, "accuracy": 97, "errors": 3, "durationMs": 40000, "chars": 160, "contentId": "shinel-1", "missed": {"о": 2, " ": 1}}
