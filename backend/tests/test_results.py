from conftest import RESULT, register


def test_results_need_login(client):
    assert client.post("/api/results", json=[RESULT]).status_code == 401
    assert client.get("/api/results").status_code == 401


def test_save_and_list_results_by_language(client):
    register(client)
    en = {**RESULT, "lang": "en", "contentId": "alice-1"}
    assert client.post("/api/results", json=[RESULT, en]).status_code == 201
    ru = client.get("/api/results", params={"lang": "ru"}).json()
    assert len(ru) == 1
    assert ru[0]["missed"] == {"о": 2, " ": 1}
    assert ru[0]["at"] > 0
    assert len(client.get("/api/results").json()) == 2


def test_results_are_private_to_each_user(client):
    register(client)
    client.post("/api/results", json=[RESULT])
    client.post("/api/auth/logout")
    register(client, "bob")
    assert client.get("/api/results").json() == []


def test_newest_first_and_guest_timestamps_kept(client):
    register(client)
    client.post("/api/results", json=[{**RESULT, "at": 1_000}, {**RESULT, "at": 2_000}])
    assert [r["at"] for r in client.get("/api/results").json()] == [2_000, 1_000]


def test_lesson_results_carry_stars(client):
    register(client)
    lesson = {**RESULT, "mode": "lesson", "lessonId": "ru-01", "stars": 2}
    client.post("/api/results", json=[lesson])
    got = client.get("/api/results").json()[0]
    assert got["lessonId"] == "ru-01" and got["stars"] == 2


def test_implausible_results_are_rejected(client):
    register(client)
    assert client.post("/api/results", json=[{**RESULT, "cpm": 5000}]).status_code == 422
    assert client.post("/api/results", json=[{**RESULT, "accuracy": 140}]).status_code == 422
    assert client.post("/api/results", json=[{**RESULT, "mode": "hack"}]).status_code == 422
    assert client.post("/api/results", json=[RESULT] * 501).status_code == 422


def test_input_kind_is_kept_and_defaults_to_keys(client):
    register(client)
    client.post("/api/results", json=[{**RESULT, "at": 1_000}, {**RESULT, "at": 2_000, "input": "phone"}])
    assert [r["input"] for r in client.get("/api/results").json()] == ["phone", "keys"]
    assert client.post("/api/results", json=[{**RESULT, "input": "tablet"}]).status_code == 422


def test_old_database_gets_the_input_column(tmp_path):
    import sqlite3
    from ritm_api.db import Database

    path = str(tmp_path / "old.db")
    conn = sqlite3.connect(path)
    conn.executescript(
        "create table results (id integer primary key, user_id integer, at integer, mode text, lang text, cpm integer,"
        " accuracy integer, errors integer, duration_ms integer, chars integer, content_id text, lesson_id text,"
        " stars integer, missed text not null default '{}');"
        "insert into results(user_id, at, mode, lang, cpm, accuracy, errors, duration_ms, chars) values (1,1,'lit','ru',200,95,1,10000,30);"
    )
    conn.close()
    db = Database(path)
    assert db.execute("select input from results").fetchone()[0] == "keys"
    Database(path)  # second start: nothing to migrate
