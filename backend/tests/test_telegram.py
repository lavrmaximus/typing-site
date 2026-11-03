import time

from conftest import register, telegram_payload


def test_config_exposes_bot_name(client):
    assert client.get("/api/config").json() == {"telegramBot": "ritm_test_bot"}


def test_valid_telegram_login_creates_user(client):
    r = client.post("/api/auth/telegram", json=telegram_payload())
    assert r.status_code == 200
    me = client.get("/api/me").json()
    assert me["telegram"]["username"] == "tg_alice"
    assert me["hasPassword"] is False


def test_same_telegram_account_logs_into_same_user(client):
    client.post("/api/auth/telegram", json=telegram_payload())
    first = client.get("/api/me").json()["id"]
    client.post("/api/auth/logout")
    client.post("/api/auth/telegram", json=telegram_payload())
    assert client.get("/api/me").json()["id"] == first


def test_bad_signature_and_stale_login_rejected(client):
    bad = telegram_payload()
    bad["hash"] = "0" * 64
    assert client.post("/api/auth/telegram", json=bad).status_code == 401
    stale = telegram_payload(auth_date=int(time.time()) - 2 * 86400)
    assert client.post("/api/auth/telegram", json=stale).status_code == 401
    forged = telegram_payload(token="999:OTHER")
    assert client.post("/api/auth/telegram", json=forged).status_code == 401


def test_telegram_links_to_logged_in_account(client):
    register(client)
    uid = client.get("/api/me").json()["id"]
    assert client.post("/api/auth/telegram", json=telegram_payload()).status_code == 200
    me = client.get("/api/me").json()
    assert me["id"] == uid and me["telegram"]["username"] == "tg_alice"


def test_telegram_disabled_without_token(tmp_path):
    from fastapi.testclient import TestClient
    from ritm_api.main import Settings, create_app

    c = TestClient(create_app(Settings(db_path=str(tmp_path / "x.db"))))
    assert c.get("/api/config").json() == {"telegramBot": None}
    assert c.post("/api/auth/telegram", json=telegram_payload()).status_code == 404
