"""SQLite storage. One connection guarded by a lock: plenty for a small server."""
import sqlite3
import threading

SCHEMA = """
create table if not exists users (
  id integer primary key,
  username text not null,
  username_key text not null unique,
  password_hash text,
  telegram_id integer unique,
  telegram_username text,
  created_at integer not null
);
create table if not exists sessions (
  token_hash text primary key,
  user_id integer not null references users(id) on delete cascade,
  expires_at integer not null
);
create table if not exists results (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  at integer not null,
  mode text not null,
  lang text not null,
  cpm integer not null,
  accuracy integer not null,
  errors integer not null,
  duration_ms integer not null,
  chars integer not null,
  content_id text,
  lesson_id text,
  stars integer,
  missed text not null default '{}',
  input text not null default 'keys'
);
create index if not exists results_user_at on results(user_id, at desc);
"""


class Database:
    def __init__(self, path: str):
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.execute("pragma journal_mode=wal")
        self.conn.execute("pragma foreign_keys=on")
        self.conn.executescript(SCHEMA)
        self._migrate()
        self.lock = threading.Lock()

    def _migrate(self) -> None:
        cols = {r[1] for r in self.conn.execute("pragma table_info(results)")}
        if "input" not in cols:
            # results typed before the split: all treated as physical-keyboard input
            self.conn.execute("alter table results add column input text not null default 'keys'")
            self.conn.commit()

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self.lock:
            cur = self.conn.execute(sql, params)
            self.conn.commit()
            return cur

    def executemany(self, sql: str, rows: list[tuple]) -> None:
        with self.lock:
            self.conn.executemany(sql, rows)
            self.conn.commit()
