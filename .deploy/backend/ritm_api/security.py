"""Password hashing (stdlib scrypt), session tokens, Telegram login check, login throttling."""
import base64
import hashlib
import hmac
import secrets
import threading
import time
from collections import deque

N, R, P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=N, r=R, p=P, dklen=32)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password: str, stored: str | None) -> bool:
    if not stored or not stored.startswith("scrypt$"):
        return False
    _, salt_b64, digest_b64 = stored.split("$")
    digest = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt_b64), n=N, r=R, p=P, dklen=32)
    return hmac.compare_digest(digest, base64.b64decode(digest_b64))


def new_token() -> tuple[str, str]:
    """(token for the cookie, hash to store)."""
    token = secrets.token_urlsafe(32)
    return token, hashlib.sha256(token.encode()).hexdigest()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def check_telegram(data: dict, bot_token: str, max_age_s: int = 86400) -> bool:
    """Verify a Telegram Login Widget payload (https://core.telegram.org/widgets/login#checking-authorization)."""
    received = str(data.get("hash", ""))
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data) if k != "hash")
    secret = hashlib.sha256(bot_token.encode()).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received):
        return False
    try:
        return time.time() - int(data["auth_date"]) <= max_age_s
    except (KeyError, ValueError):
        return False


class Throttle:
    """At most `limit` failures per key in a sliding window."""

    def __init__(self, limit: int = 10, window_s: int = 900):
        self.limit, self.window = limit, window_s
        self.hits: dict[str, deque] = {}
        self.lock = threading.Lock()

    def _recent(self, key: str) -> deque:
        q = self.hits.setdefault(key, deque())
        cutoff = time.time() - self.window
        while q and q[0] < cutoff:
            q.popleft()
        return q

    def blocked(self, key: str) -> bool:
        with self.lock:
            return len(self._recent(key)) >= self.limit

    def fail(self, key: str) -> None:
        with self.lock:
            self._recent(key).append(time.time())
