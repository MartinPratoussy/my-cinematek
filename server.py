import json
import os
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote_plus, urlparse
from urllib.request import Request, urlopen

TMDB_API_URL = "https://api.themoviedb.org/3/search/movie"
DEFAULT_DB = os.path.join(os.environ.get("LOCALAPPDATA", os.path.dirname(__file__)), "my-cinematek.db")

class Database:
    def __init__(self):
        self.postgres = bool(os.environ.get("DATABASE_URL"))
        if os.environ.get("RENDER") and not self.postgres:
            raise RuntimeError("DATABASE_URL is required on Render; refusing to use ephemeral SQLite storage.")
        if self.postgres:
            try:
                import psycopg
                self.connection = psycopg.connect(os.environ["DATABASE_URL"])
            except ImportError as error:
                raise RuntimeError("DATABASE_URL is set but psycopg is not installed.") from error
        else:
            self.connection = sqlite3.connect(os.environ.get("SQLITE_PATH", DEFAULT_DB), check_same_thread=False)
        self.init_schema()

    def query(self, statement, params=(), fetch=False):
        if self.postgres:
            statement = statement.replace("?", "%s")
        cursor = self.connection.cursor()
        try:
            cursor.execute(statement, params)
            rows = cursor.fetchall() if fetch else []
            self.connection.commit()
            return rows
        except Exception:
            self.connection.rollback()
            raise
        finally:
            cursor.close()

    def init_schema(self):
        identity = "SERIAL PRIMARY KEY" if self.postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
        self.query(f"CREATE TABLE IF NOT EXISTS posts (id {identity}, title TEXT NOT NULL, movie_title TEXT NOT NULL, watched_date TEXT NOT NULL, rating REAL NOT NULL, context TEXT, venue TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL, body TEXT NOT NULL, conclusion TEXT NOT NULL DEFAULT '', film TEXT NOT NULL)")
        try:
            self.query("ALTER TABLE posts ADD COLUMN venue TEXT NOT NULL DEFAULT ''")
        except Exception:
            pass
        try:
            self.query("ALTER TABLE posts ADD COLUMN conclusion TEXT NOT NULL DEFAULT ''")
        except Exception:
            pass
    def insert_post(self, post):
        values = (post["title"], post["movieTitle"], post["date"], post["rating"], post.get("context", ""), json.dumps(post.get("venue", {})), json.dumps(post.get("tags", [])), post["body"], post.get("conclusion", ""), json.dumps(post.get("film", {})))
        if self.postgres:
            return self.query("INSERT INTO posts (title, movie_title, watched_date, rating, context, venue, tags, body, conclusion, film) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id", values, True)[0][0]
        cursor = self.connection.cursor()
        cursor.execute("INSERT INTO posts (title, movie_title, watched_date, rating, context, venue, tags, body, conclusion, film) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", values)
        post_id = cursor.lastrowid
        self.connection.commit()
        cursor.close()
        return post_id

    @staticmethod
    def serialize(row):
        return {"id": row[0], "title": row[1], "movieTitle": row[2], "date": row[3], "rating": row[4], "context": row[5], "venue": json.loads(row[6] or "{}"), "tags": json.loads(row[7]), "body": row[8], "conclusion": row[9], "film": json.loads(row[10])}

    def all_posts(self):
        rows = self.query("SELECT id, title, movie_title, watched_date, rating, context, venue, tags, body, conclusion, film FROM posts ORDER BY watched_date DESC", fetch=True)
        return [self.serialize(row) for row in rows]

    def get_post(self, post_id):
        rows = self.query("SELECT id, title, movie_title, watched_date, rating, context, venue, tags, body, conclusion, film FROM posts WHERE id = ?", (post_id,), True)
        return self.serialize(rows[0]) if rows else None

    def update_post(self, post_id, post):
        values = (post["title"], post["movieTitle"], post["date"], post["rating"], post.get("context", ""), json.dumps(post.get("venue", {})), json.dumps(post.get("tags", [])), post["body"], post.get("conclusion", ""), json.dumps(post.get("film", {})), post_id)
        self.query("UPDATE posts SET title = ?, movie_title = ?, watched_date = ?, rating = ?, context = ?, venue = ?, tags = ?, body = ?, conclusion = ?, film = ? WHERE id = ?", values)


db = Database()


class CinematekHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/posts":
            return self.send_json(db.all_posts())
        if parsed.path == "/api/search":
            return self.search_tmdb(parse_qs(parsed.query).get("query", [""])[0].strip())
        if parsed.path == "/api/places":
            return self.search_places(parse_qs(parsed.query).get("query", [""])[0].strip())
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path == "/api/auth":
            return self.send_json({"authenticated": self.authorized()}, 200 if self.authorized() else 401)
        if urlparse(self.path).path != "/api/posts":
            return self.send_json({"error": "Not found."}, 404)
        if not self.authorized():
            return self.send_json({"error": "Author access required."}, 401)
        post_id = db.insert_post(self.read_json())
        return self.send_json(db.get_post(post_id), 201)

    def do_PUT(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/posts/"):
            return self.send_json({"error": "Not found."}, 404)
        if not self.authorized():
            return self.send_json({"error": "Author access required."}, 401)
        post_id = int(parsed.path.rsplit("/", 1)[-1])
        db.update_post(post_id, self.read_json())
        return self.send_json(db.get_post(post_id))

    def authorized(self):
        return self.headers.get("X-Author-Password") == os.environ.get("AUTHOR_PASSWORD", "cinematek")

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def search_tmdb(self, query):
        api_key = os.environ.get("TMDB_API_KEY")
        if not api_key:
            return self.send_json({"error": "Add TMDB_API_KEY before searching films."}, 503)
        if not query:
            return self.send_json({"results": []})
        request = Request(f"{TMDB_API_URL}?api_key={api_key}&language=en-US&include_adult=false&query={query}", headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response:
                return self.send_json({"results": json.loads(response.read().decode("utf-8")).get("results", [])})
        except HTTPError as error:
            message = "TMDB rejected the API key. Check that the key is active and copied correctly." if error.code in (401, 403) else f"TMDB returned HTTP {error.code}."
            return self.send_json({"error": message}, 502)
        except URLError:
            return self.send_json({"error": "TMDB could not be reached from this server."}, 502)
        except (TimeoutError, json.JSONDecodeError):
            return self.send_json({"error": "TMDB returned an invalid or delayed response."}, 502)
        except Exception:
            return self.send_json({"error": "Film catalogue request failed on the server."}, 502)

    def search_places(self, query):
        if not query:
            return self.send_json({"results": []})
        request = Request(
            f"https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=fr,de,be,lu,ch,gb&q={quote_plus(query + ' cinema')}",
            headers={"User-Agent": "my-cinematek/1.0 contact@my-cinematek.local", "Accept": "application/json"},
        )
        try:
            with urlopen(request, timeout=10) as response:
                places = json.loads(response.read().decode("utf-8"))
            return self.send_json({"results": [{"name": place.get("display_name", "").split(",")[0], "displayName": place.get("display_name", ""), "location": f"https://www.openstreetmap.org/?mlat={place.get('lat')}&mlon={place.get('lon')}#map=18/{place.get('lat')}/{place.get('lon')}"} for place in places]})
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            return self.send_json({"error": "Cinema search is temporarily unavailable."}, 502)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    ThreadingHTTPServer(("", port), CinematekHandler).serve_forever()
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TMDB_API_URL = "https://api.themoviedb.org/3/search/movie"

DEFAULT_DB = os.path.join(os.environ.get("LOCALAPPDATA", os.path.dirname(__file__)), "my-cinematek.db")

class Database:
    def __init__(self):
        self.url = os.environ.get("DATABASE_URL")
        self.connection = None
        if self.url:
            try:
                import psycopg
                self.connection = psycopg.connect(self.url)
                self.postgres = True
            except ImportError as error:
                raise RuntimeError("DATABASE_URL is set but psycopg is not installed.") from error
        else:
            self.connection = sqlite3.connect(os.environ.get("SQLITE_PATH", DEFAULT_DB), check_same_thread=False)
            self.postgres = False
        self.init_schema()

    def query(self, statement, params=(), fetch=False):
        if self.postgres:
            statement = statement.replace("?", "%s")
        cursor = self.connection.cursor()
        try:
            cursor.execute(statement, params)
            rows = cursor.fetchall() if fetch else []
            self.connection.commit()
            return rows
        except Exception:
            self.connection.rollback()
            raise
        finally:
            cursor.close()

    def init_schema(self):
        identity = "SERIAL PRIMARY KEY" if self.postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
        self.query(f"""
            CREATE TABLE IF NOT EXISTS posts (
                id {identity}, title TEXT NOT NULL, movie_title TEXT NOT NULL,
                watched_date TEXT NOT NULL, rating REAL NOT NULL, context TEXT,
                tags TEXT NOT NULL, body TEXT NOT NULL, film TEXT NOT NULL
            )
        """)
    def insert_post(self, post):
        values = (post["title"], post["movieTitle"], post["date"], post["rating"], post.get("context", ""), json.dumps(post.get("tags", [])), post["body"], json.dumps(post.get("film", {})))
        if self.postgres:
            rows = self.query("INSERT INTO posts (title, movie_title, watched_date, rating, context, tags, body, film) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id", values, True)
            return rows[0][0]
        cursor = self.connection.cursor()
        cursor.execute("INSERT INTO posts (title, movie_title, watched_date, rating, context, tags, body, film) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", values)
        post_id = cursor.lastrowid
        self.connection.commit()
        cursor.close()
        return post_id

    def serialize(self, row):
        return {"id": row[0], "title": row[1], "movieTitle": row[2], "date": row[3], "rating": row[4], "context": row[5], "tags": json.loads(row[6]), "body": row[7], "film": json.loads(row[8])}

    def all_posts(self):
        rows = self.query("SELECT id, title, movie_title, watched_date, rating, context, tags, body, film FROM posts ORDER BY watched_date DESC", fetch=True)
        return [self.serialize(row) for row in rows]

    def get_post(self, post_id):
        rows = self.query("SELECT id, title, movie_title, watched_date, rating, context, tags, body, film FROM posts WHERE id = ?", (post_id,), True)
        return self.serialize(rows[0]) if rows else None

    def update_post(self, post_id, post):
        values = (post["title"], post["movieTitle"], post["date"], post["rating"], post.get("context", ""), json.dumps(post.get("tags", [])), post["body"], json.dumps(post.get("film", {})), post_id)
        self.query("UPDATE posts SET title = ?, movie_title = ?, watched_date = ?, rating = ?, context = ?, tags = ?, body = ?, film = ? WHERE id = ?", values)


db = Database()


class CinematekHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/posts":
            return self.send_json(db.all_posts())
        if parsed.path == "/api/search":
            return self.search_tmdb(parse_qs(parsed.query).get("query", [""])[0].strip())
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/posts":
            return self.send_json({"error": "Not found."}, 404)
        if not self.authorized():
            return self.send_json({"error": "Author access required."}, 401)
        post_id = db.insert_post(self.read_json())
        return self.send_json(db.get_post(post_id), 201)

    def do_PUT(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/posts/"):
            return self.send_json({"error": "Not found."}, 404)
        if not self.authorized():
            return self.send_json({"error": "Author access required."}, 401)
        post_id = int(parsed.path.rsplit("/", 1)[-1])
        db.update_post(post_id, self.read_json())
        return self.send_json(db.get_post(post_id))

    def authorized(self):
        return self.headers.get("X-Author-Password") == os.environ.get("AUTHOR_PASSWORD", "cinematek")

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def search_tmdb(self, query):
        api_key = os.environ.get("TMDB_API_KEY")
        if not api_key:
            return self.send_json({"error": "Add TMDB_API_KEY before searching films."}, 503)
        if not query:
            return self.send_json({"results": []})
        request = Request(f"{TMDB_API_URL}?api_key={api_key}&language=en-US&include_adult=false&query={query}", headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response:
                return self.send_json({"results": json.loads(response.read().decode("utf-8")).get("results", [])})
        except HTTPError as error:
            message = "TMDB rejected the API key. Check that the key is active and copied correctly." if error.code in (401, 403) else f"TMDB returned HTTP {error.code}."
            return self.send_json({"error": message}, 502)
        except URLError:
            return self.send_json({"error": "TMDB could not be reached from this server."}, 502)
        except (TimeoutError, json.JSONDecodeError):
            return self.send_json({"error": "TMDB returned an invalid or delayed response."}, 502)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    ThreadingHTTPServer(("", port), CinematekHandler).serve_forever()
