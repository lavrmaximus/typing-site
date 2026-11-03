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
