"""ritm API: accounts (username+password, Telegram), sessions and typing results.

Run: uvicorn ritm_api.main:create_app --factory --host 127.0.0.1 --port 8000
"""
import json
import os
import time
from dataclasses import dataclass, field
from typing import Annotated, Literal

from fastapi import Body, Cookie, Depends, FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, Field

from .db import Database
from .security import Throttle, check_telegram, hash_password, new_token, token_hash, verify_password

COOKIE = "ritm_session"


@dataclass
class Settings:
    db_path: str = field(default_factory=lambda: os.environ.get("RITM_DB", "ritm.db"))
    telegram_bot_token: str | None = field(default_factory=lambda: os.environ.get("RITM_TELEGRAM_BOT_TOKEN") or None)
    telegram_bot_name: str | None = field(default_factory=lambda: os.environ.get("RITM_TELEGRAM_BOT_NAME") or None)
    # None = auto: Secure exactly when the request arrived over HTTPS (behind nginx: X-Forwarded-Proto)
    cookie_secure: bool | None = field(default_factory=lambda: {"1": True, "0": False}.get(os.environ.get("RITM_COOKIE_SECURE", "auto")))
    session_days: int = 30


Username = Annotated[str, Field(pattern=r"^[\w.\-]{3,32}$")]
Password = Annotated[str, Field(min_length=6, max_length=128)]


class Credentials(BaseModel):
    username: Username
    password: Password


class LoginIn(BaseModel):
    username: Annotated[str, Field(max_length=64)]
    password: Annotated[str, Field(max_length=128)]


class ResultIn(BaseModel):
    mode: Literal["code", "lit", "words", "lesson"]
    lang: Literal["ru", "en"]
    cpm: Annotated[int, Field(ge=0, le=2000)]
    accuracy: Annotated[int, Field(ge=0, le=100)]
    errors: Annotated[int, Field(ge=0, le=100_000)]
    durationMs: Annotated[int, Field(ge=0, le=3_600_000)]
    chars: Annotated[int, Field(ge=0, le=100_000)]
    contentId: Annotated[str | None, Field(max_length=200)] = None
    lessonId: Annotated[str | None, Field(max_length=40)] = None
    stars: Annotated[int | None, Field(ge=0, le=3)] = None
    missed: Annotated[dict[Annotated[str, Field(min_length=1, max_length=2)], Annotated[int, Field(ge=0, le=10_000)]], Field(max_length=300)] = {}
    at: Annotated[int | None, Field(ge=0)] = None
    # physical keyboard or a phone's on-screen keyboard: their speeds are not comparable
    input: Literal["keys", "phone"] = "keys"


def create_app(settings: Settings | None = None) -> FastAPI:
    s = settings or Settings()
    db = Database(s.db_path)
    throttle = Throttle()
    app = FastAPI(title="ritm API", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.db = db

    def start_session(response: Response, user_id: int, request: Request) -> None:
        token, h = new_token()
        max_age = s.session_days * 86400
        db.execute("insert into sessions(token_hash, user_id, expires_at) values (?,?,?)", (h, user_id, int(time.time()) + max_age))
        response.set_cookie(COOKIE, token, max_age=max_age, httponly=True, samesite="lax", secure=request.url.scheme == "https" if s.cookie_secure is None else s.cookie_secure, path="/")

    def current_user_id(ritm_session: str | None = Cookie(default=None)) -> int | None:
        if not ritm_session:
            return None
        row = db.execute("select user_id from sessions where token_hash=? and expires_at>?", (token_hash(ritm_session), int(time.time()))).fetchone()
        return row[0] if row else None

    def require_user(uid: int | None = Depends(current_user_id)) -> int:
        if uid is None:
            raise HTTPException(401, "not logged in")
        return uid

    def me_payload(uid: int) -> dict:
        row = db.execute("select id, username, password_hash, telegram_id, telegram_username from users where id=?", (uid,)).fetchone()
        return {
            "id": row[0],
            "username": row[1],
            "hasPassword": row[2] is not None,
            "telegram": {"id": row[3], "username": row[4]} if row[3] else None,
        }

    def free_username(base: str) -> str:
        name, n = base, 1
        while db.execute("select 1 from users where username_key=?", (name.lower(),)).fetchone():
            n += 1
            name = f"{base}{n}"
        return name

    @app.get("/api/config")
    def config():
        return {"telegramBot": s.telegram_bot_name if s.telegram_bot_token else None}

    @app.post("/api/auth/register", status_code=201)
    def register(body: Credentials, request: Request, response: Response):
        if db.execute("select 1 from users where username_key=?", (body.username.lower(),)).fetchone():
            raise HTTPException(409, "username taken")
        cur = db.execute(
            "insert into users(username, username_key, password_hash, created_at) values (?,?,?,?)",
            (body.username, body.username.lower(), hash_password(body.password), int(time.time())),
        )
        start_session(response, cur.lastrowid, request)
        return me_payload(cur.lastrowid)

    @app.post("/api/auth/login")
    def login(body: LoginIn, request: Request, response: Response):
        key = f"{request.client.host if request.client else '-'}:{body.username.lower()}"
        if throttle.blocked(key):
            raise HTTPException(429, "too many attempts, try again later")
        row = db.execute("select id, password_hash from users where username_key=?", (body.username.lower(),)).fetchone()
        if not row or not verify_password(body.password, row[1]):
            throttle.fail(key)
            raise HTTPException(401, "wrong username or password")
        start_session(response, row[0], request)
        return me_payload(row[0])

    @app.post("/api/auth/telegram")
    def telegram(request: Request, response: Response, data: dict = Body(...), uid: int | None = Depends(current_user_id)):
        if not s.telegram_bot_token:
            raise HTTPException(404, "telegram login is not configured")
        if not check_telegram(data, s.telegram_bot_token):
            raise HTTPException(401, "telegram signature is invalid or expired")
        tg_id, tg_user = int(data["id"]), data.get("username")
        owner = db.execute("select id from users where telegram_id=?", (tg_id,)).fetchone()
        if uid is not None:
            if owner and owner[0] != uid:
                raise HTTPException(409, "this telegram account is linked to another user")
            db.execute("update users set telegram_id=?, telegram_username=? where id=?", (tg_id, tg_user, uid))
            return me_payload(uid)
        if owner:
            db.execute("update users set telegram_username=? where id=?", (tg_user, owner[0]))
            user_id = owner[0]
        else:
            name = free_username(tg_user or f"tg{tg_id}")
            user_id = db.execute(
                "insert into users(username, username_key, telegram_id, telegram_username, created_at) values (?,?,?,?,?)",
                (name, name.lower(), tg_id, tg_user, int(time.time())),
            ).lastrowid
        start_session(response, user_id, request)
        return me_payload(user_id)

    @app.post("/api/auth/logout")
    def logout(response: Response, ritm_session: str | None = Cookie(default=None)):
        if ritm_session:
            db.execute("delete from sessions where token_hash=?", (token_hash(ritm_session),))
        response.delete_cookie(COOKIE, path="/")
        return {"ok": True}

    @app.get("/api/me")
    def me(uid: int = Depends(require_user)):
        return me_payload(uid)

    @app.post("/api/results", status_code=201)
    def save_results(results: Annotated[list[ResultIn], Field(max_length=500)], uid: int = Depends(require_user)):
        now = int(time.time() * 1000)
        rows = [
            (uid, min(r.at or now, now), r.mode, r.lang, r.cpm, r.accuracy, r.errors, r.durationMs, r.chars, r.contentId, r.lessonId, r.stars, json.dumps(r.missed, ensure_ascii=False), r.input)
            for r in results
        ]
        db.executemany(
            "insert into results(user_id, at, mode, lang, cpm, accuracy, errors, duration_ms, chars, content_id, lesson_id, stars, missed, input) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            rows,
        )
        return {"saved": len(rows)}

    @app.get("/api/results")
    def list_results(lang: Literal["ru", "en"] | None = None, limit: Annotated[int, Field(ge=1, le=2000)] = 1000, uid: int = Depends(require_user)):
        sql = "select at, mode, lang, cpm, accuracy, errors, duration_ms, chars, content_id, lesson_id, stars, missed, input from results where user_id=?"
        params: tuple = (uid,)
        if lang:
            sql += " and lang=?"
            params += (lang,)
        sql += " order by at desc, id desc limit ?"
        rows = db.execute(sql, params + (limit,)).fetchall()
        keys = ["at", "mode", "lang", "cpm", "accuracy", "errors", "durationMs", "chars", "contentId", "lessonId", "stars"]
        return [{**dict(zip(keys, r[:11])), "missed": json.loads(r[11]), "input": r[12]} for r in rows]

    return app

