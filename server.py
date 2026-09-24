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
            raise RuntimeError("DATABASE_URL is required on Render.")
        if self.postgres:
            import psycopg
            print("Connecting to PostgreSQL...", flush=True)
            self.connection = psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=10)
            print("PostgreSQL connected.", flush=True)
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
        print("Checking database schema...", flush=True)
        identity = "SERIAL PRIMARY KEY" if self.postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
        self.query(f"CREATE TABLE IF NOT EXISTS posts (id {identity}, title TEXT NOT NULL, movie_title TEXT NOT NULL, watched_date TEXT NOT NULL, rating REAL NOT NULL, context TEXT, venue TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL, body TEXT NOT NULL, conclusion TEXT NOT NULL DEFAULT '', film TEXT NOT NULL)")
        for column, definition in (("venue", "TEXT NOT NULL DEFAULT ''"), ("conclusion", "TEXT NOT NULL DEFAULT ''")):
            try:
                self.query(f"ALTER TABLE posts ADD COLUMN {column} {definition}")
            except Exception:
                pass
        print("Database schema ready.", flush=True)

    def insert_post(self, post):
        values = (post["title"], post["movieTitle"], post["date"], post["rating"], post.get("context", ""), json.dumps(post.get("venue", {})), json.dumps(post.get("tags", [])), post["body"], post.get("conclusion", ""), json.dumps(post.get("film", {})))
        statement = "INSERT INTO posts (title, movie_title, watched_date, rating, context, venue, tags, body, conclusion, film) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        if self.postgres:
            return self.query(statement + " RETURNING id", values, True)[0][0]
        cursor = self.connection.cursor()
        cursor.execute(statement, values)
        post_id = cursor.lastrowid
        self.connection.commit()
        cursor.close()
        return post_id

    def serialize(self, row):
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
        query = parse_qs(parsed.query).get("query", [""])[0].strip()
        if parsed.path == "/api/posts": return self.send_json(db.all_posts())
        if parsed.path == "/api/search": return self.search_tmdb(query)
        if parsed.path == "/api/movie": return self.movie_details(parse_qs(parsed.query).get("id", [""])[0].strip())
        if parsed.path == "/api/places": return self.search_places(query)
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/auth":
            authenticated = self.authorized()
            return self.send_json({"authenticated": authenticated}, 200 if authenticated else 401)
        if path != "/api/posts": return self.send_json({"error": "Not found."}, 404)
        if not self.authorized(): return self.send_json({"error": "Author access required."}, 401)
        post_id = db.insert_post(self.read_json())
        return self.send_json(db.get_post(post_id), 201)

    def do_PUT(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/posts/"): return self.send_json({"error": "Not found."}, 404)
        if not self.authorized(): return self.send_json({"error": "Author access required."}, 401)
        db.update_post(int(path.rsplit("/", 1)[-1]), self.read_json())
        return self.send_json(db.get_post(int(path.rsplit("/", 1)[-1])))

    def authorized(self): return self.headers.get("X-Author-Password") == os.environ.get("AUTHOR_PASSWORD", "cinematek")
    def read_json(self): return json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))).decode("utf-8"))

    def search_tmdb(self, query):
        key = os.environ.get("TMDB_API_KEY")
        if not key: return self.send_json({"error": "Film search is not configured yet."}, 503)
        request = Request(f"{TMDB_API_URL}?api_key={key}&language=en-US&include_adult=false&query={quote_plus(query)}", headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response: return self.send_json({"results": json.loads(response.read().decode()).get("results", [])})
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError): return self.send_json({"error": "Film catalogue is temporarily unavailable."}, 502)

    def movie_details(self, movie_id):
        key = os.environ.get("TMDB_API_KEY")
        if not key or not movie_id.isdigit(): return self.send_json({"error": "Film details are unavailable."}, 400)
        request = Request(f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={key}&language=en-US&append_to_response=credits", headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response: film = json.loads(response.read().decode())
            director = next((person["name"] for person in film.get("credits", {}).get("crew", []) if person.get("job") == "Director"), "")
            return self.send_json({"id": film.get("id"), "title": film.get("title", ""), "year": (film.get("release_date") or "")[:4], "poster": f"https://image.tmdb.org/t/p/w500{film['poster_path']}" if film.get("poster_path") else "", "runtime": film.get("runtime"), "genres": [item["name"] for item in film.get("genres", [])], "director": director, "cast": [item["name"] for item in film.get("credits", {}).get("cast", [])[:5]], "budget": film.get("budget") or 0, "countries": [item["name"] for item in film.get("production_countries", [])]})
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError): return self.send_json({"error": "Film details are temporarily unavailable."}, 502)

    def search_places(self, query):
        if not query: return self.send_json({"results": []})
        request = Request(f"https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=fr,de,be,lu,ch,gb&q={quote_plus(query + ' cinema')}", headers={"User-Agent": "my-cinematek/1.0", "Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response: places = json.loads(response.read().decode())
            return self.send_json({"results": [{"name": item.get("display_name", "").split(",")[0], "displayName": item.get("display_name", ""), "location": f"https://www.openstreetmap.org/?mlat={item.get('lat')}&mlon={item.get('lon')}#map=18/{item.get('lat')}/{item.get('lon')}"} for item in places]})
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError): return self.send_json({"error": "Cinema search is temporarily unavailable."}, 502)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"Starting my-cinematek on port {port}...", flush=True)
    ThreadingHTTPServer(("", port), CinematekHandler).serve_forever()
