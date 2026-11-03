from conftest import register


def test_register_sets_session_and_me(client):
    r = register(client)
    assert r.status_code == 201
    assert "ritm_session" in r.cookies
    me = client.get("/api/me").json()
    assert me["username"] == "alice"
    assert me["hasPassword"] is True
    assert me["telegram"] is None


def test_username_is_unique_ignoring_case(client):
    register(client)
    client.cookies.clear()
    assert register(client, "ALICE").status_code == 409


def test_any_letters_are_allowed_in_username(client):
    assert register(client, "Вася_2009").status_code == 201


def test_invalid_username_or_password_rejected(client):
    assert register(client, "a b").status_code == 422
    assert register(client, "ab").status_code == 422
    assert register(client, "bob", "123").status_code == 422


def test_login_logout(client):
    register(client)
    client.post("/api/auth/logout")
    assert client.get("/api/me").status_code == 401
    assert client.post("/api/auth/login", json={"username": "alice", "password": "nope"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "Alice", "password": "secret123"}).status_code == 200
    assert client.get("/api/me").json()["username"] == "alice"


def test_password_is_not_stored_in_plain_text(app, client):
    register(client)
    row = app.state.db.execute("select password_hash from users").fetchone()
    assert "secret123" not in row[0]
    assert row[0].startswith("scrypt$")


def test_repeated_failed_logins_are_throttled(client):
    register(client)
    client.post("/api/auth/logout")
    codes = [client.post("/api/auth/login", json={"username": "alice", "password": "bad"}).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429


def test_session_cookie_flags(client):
    r = register(client)
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie and "path=/" in cookie
