import json
import os
import re
import sqlite3
import threading
import unicodedata
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote_plus, urlparse
from urllib.request import Request, urlopen

TMDB_API_URL = "https://api.themoviedb.org/3/search/movie"
DEFAULT_DB = os.path.join(os.environ.get("LOCALAPPDATA", os.path.dirname(__file__)), "my-cinematek.db")

def normalized_title(value):
    plain = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower()
    plain = re.sub(r"(?:\s*[,(-]\s*|\s+)\d{4}\)?\s*$", "", plain)
    return "".join(character for character in plain if character.isalnum())

class Database:
    def __init__(self):
        self.postgres = bool(os.environ.get("DATABASE_URL"))
        self.lock = threading.Lock()
        if os.environ.get("RENDER") and not self.postgres:
            raise RuntimeError("DATABASE_URL is required on Render.")
        if self.postgres:
            import psycopg
            self.psycopg = psycopg
            self._connect_postgres()
        else:
            self.connection = sqlite3.connect(os.environ.get("SQLITE_PATH", DEFAULT_DB), check_same_thread=False)
        self.init_schema()

    def _connect_postgres(self):
        print("Connecting to PostgreSQL...", flush=True)
        self.connection = self.psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=10)
        print("PostgreSQL connected.", flush=True)

    def query(self, statement, params=(), fetch=False):
        if self.postgres:
            statement = statement.replace("?", "%s")
        with self.lock:
            for attempt in range(2):
                cursor = None
                try:
                    cursor = self.connection.cursor()
                    cursor.execute(statement, params)
                    rows = cursor.fetchall() if fetch else []
                    self.connection.commit()
                    return rows
                except self.psycopg.OperationalError if self.postgres else sqlite3.OperationalError:
                    if cursor is not None:
                        cursor.close()
                        cursor = None
                    if not self.postgres or attempt == 1:
                        raise
                    try:
                        self.connection.close()
                    except Exception:
                        pass
                    print("PostgreSQL connection was closed; reconnecting and retrying query.", flush=True)
                    self._connect_postgres()
                except Exception:
                    try:
                        self.connection.rollback()
                    except Exception:
                        pass
                    raise
                finally:
                    if cursor is not None:
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
        self.query(f"CREATE TABLE IF NOT EXISTS watched_films (id {identity}, watched_date TEXT NOT NULL, venue TEXT NOT NULL DEFAULT '', rating REAL, note TEXT NOT NULL DEFAULT '', rewatch INTEGER NOT NULL DEFAULT 0, film TEXT NOT NULL)")
        for column, definition in (("rating", "REAL"), ("note", "TEXT NOT NULL DEFAULT ''"), ("rewatch", "INTEGER NOT NULL DEFAULT 0"), ("source_url", "TEXT NOT NULL DEFAULT ''")):
            try:
                self.query(f"ALTER TABLE watched_films ADD COLUMN {column} {definition}")
            except Exception:
                pass

    def insert_watched(self, item):
        values = (item["date"], json.dumps(item.get("venue", {})), item.get("rating"), item.get("note", ""), int(bool(item.get("rewatch"))), json.dumps(item.get("film", {})), item.get("sourceUrl", ""))
        statement = "INSERT INTO watched_films (watched_date, venue, rating, note, rewatch, film, source_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
        if self.postgres:
            return self.query(statement + " RETURNING id", values, True)[0][0]
        cursor = self.connection.cursor()
        cursor.execute(statement, values)
        item_id = cursor.lastrowid
        self.connection.commit()
        cursor.close()
        return item_id

    def all_watched(self, limit=8, offset=0):
        rows = self.query("SELECT id, watched_date, venue, rating, note, rewatch, film, source_url FROM watched_films ORDER BY watched_date DESC LIMIT ? OFFSET ?", (limit, offset), fetch=True)
        return [{"id": row[0], "date": row[1], "venue": json.loads(row[2] or "{}"), "rating": row[3], "note": row[4], "rewatch": bool(row[5]), "film": json.loads(row[6]), "sourceUrl": row[7] or ""} for row in rows]

    def watched_source_urls(self):
        return {row[0] for row in self.query("SELECT source_url FROM watched_films WHERE source_url <> ''", fetch=True)}

    def watched_film_keys(self):
        watched_rows = self.query("SELECT film FROM watched_films", fetch=True)
        post_rows = self.query("SELECT movie_title, film FROM posts", fetch=True)
        film_ids = set()
        film_titles = set()
        for (film_json,) in watched_rows:
            film = json.loads(film_json or "{}")
            if film.get("id") is not None:
                film_ids.add(str(film["id"]))
            if film.get("title"):
                film_titles.add(normalized_title(film["title"]))
        for movie_title, film_json in post_rows:
            film = json.loads(film_json or "{}")
            if film.get("id") is not None:
                film_ids.add(str(film["id"]))
            film_titles.add(normalized_title(film.get("title") or movie_title))
        return film_ids, film_titles

    def update_watched(self, item_id, item):
        values = (item["date"], json.dumps(item.get("venue", {})), item.get("rating"), item.get("note", ""), int(bool(item.get("rewatch"))), json.dumps(item.get("film", {})), item.get("sourceUrl", ""), item_id)
        self.query("UPDATE watched_films SET watched_date = ?, venue = ?, rating = ?, note = ?, rewatch = ?, film = ?, source_url = ? WHERE id = ?", values)
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

    def all_posts(self, limit=None, offset=0):
        statement = "SELECT id, title, movie_title, watched_date, rating, context, venue, tags, body, conclusion, film FROM posts ORDER BY watched_date DESC"
        params = ()
        if limit is not None:
            statement += " LIMIT ? OFFSET ?"
            params = (limit, offset)
        rows = self.query(statement, params, fetch=True)
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
        if parsed.path == "/api/posts":
            limit = min(max(int(parse_qs(parsed.query).get("limit", [8])[0]), 1), 50)
            offset = max(int(parse_qs(parsed.query).get("offset", [0])[0]), 0)
            return self.send_json(db.all_posts(limit, offset))
        if parsed.path.startswith("/api/posts/"):
            post_id = int(parsed.path.rsplit("/", 1)[-1])
            post = db.get_post(post_id)
            return self.send_json(post if post else {"error": "Critique introuvable."}, 200 if post else 404)
        if parsed.path == "/api/poster":
            poster_url = parse_qs(parsed.query).get("url", [""])[0]
            poster = urlparse(poster_url)
            if poster.scheme != "https" or poster.hostname != "image.tmdb.org" or not poster.path.startswith("/t/p/"):
                return self.send_json({"error": "Poster unavailable."}, 400)
            try:
                request = Request(poster_url, headers={"Accept": "image/*"})
                with urlopen(request, timeout=10) as response:
                    return self.send_bytes(response.read(), response.headers.get_content_type())
            except (HTTPError, URLError, TimeoutError):
                return self.send_json({"error": "Poster unavailable."}, 502)
        if parsed.path == "/api/watched":
            params = parse_qs(parsed.query)
            limit = min(max(int(params.get("limit", [8])[0]), 1), 50)
            offset = max(int(params.get("offset", [0])[0]), 0)
            return self.send_json(db.all_watched(limit, offset))
        if parsed.path == "/api/search": return self.search_tmdb(query)
        if parsed.path == "/api/movie": return self.movie_details(parse_qs(parsed.query).get("id", [""])[0].strip())
        if parsed.path == "/api/places": return self.search_places(query)
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/auth":
            authenticated = self.authorized()
            return self.send_json({"authenticated": authenticated}, 200 if authenticated else 401)
        if path == "/api/letterboxd/sync":
            if not self.authorized(): return self.send_json({"error": "Author access required."}, 401)
            payload = self.read_json()
            return self.sync_letterboxd(str(payload.get("username", "")).strip())
        if path == "/api/watched":
            if not self.authorized(): return self.send_json({"error": "Author access required."}, 401)
            return self.send_json({"id": db.insert_watched(self.read_json())}, 201)
        if path != "/api/posts": return self.send_json({"error": "Not found."}, 404)
        if not self.authorized(): return self.send_json({"error": "Author access required."}, 401)
        post_id = db.insert_post(self.read_json())
        return self.send_json(db.get_post(post_id), 201)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path.startswith("/api/watched/"):
            if not self.authorized(): return self.send_json({"error": "Author access required."}, 401)
            item_id = int(path.rsplit("/", 1)[-1])
            db.update_watched(item_id, self.read_json())
            return self.send_json({"id": item_id})
        if not path.startswith("/api/posts/"):
            return self.send_json({"error": "Not found."}, 404)
        if not self.authorized(): return self.send_json({"error": "Author access required."}, 401)
        post_id = int(path.rsplit("/", 1)[-1])
        db.update_post(post_id, self.read_json())
        return self.send_json(db.get_post(post_id))

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
            return self.send_json({"id": film.get("id"), "title": film.get("title", ""), "year": (film.get("release_date") or "")[:4], "releaseDate": film.get("release_date", ""), "poster": f"https://image.tmdb.org/t/p/w500{film['poster_path']}" if film.get("poster_path") else "", "runtime": film.get("runtime"), "genres": [item["name"] for item in film.get("genres", [])], "director": director, "cast": [item["name"] for item in film.get("credits", {}).get("cast", [])[:5]], "budget": film.get("budget") or 0, "countries": [item["name"] for item in film.get("production_countries", [])], "overview": film.get("overview", ""), "tagline": film.get("tagline", ""), "homepage": film.get("homepage", "")})
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError): return self.send_json({"error": "Film details are temporarily unavailable."}, 502)

    def search_places(self, query):
        if not query: return self.send_json({"results": []})
        request = Request(f"https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=fr,de,be,lu,ch,gb&q={quote_plus(query + ' cinema')}", headers={"User-Agent": "my-cinematek/1.0", "Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response: places = json.loads(response.read().decode())
            return self.send_json({"results": [{"name": item.get("display_name", "").split(",")[0], "displayName": item.get("display_name", ""), "location": f"https://www.openstreetmap.org/?mlat={item.get('lat')}&mlon={item.get('lon')}#map=18/{item.get('lat')}/{item.get('lon')}"} for item in places]})
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError): return self.send_json({"error": "Cinema search is temporarily unavailable."}, 502)

    def sync_letterboxd(self, username):
        if not re.fullmatch(r"[A-Za-z0-9_-]+", username):
            return self.send_json({"error": "Letterboxd username is invalid."}, 400)
        rss_url = f"https://letterboxd.com/{username}/rss/"
        request = Request(rss_url, headers={"User-Agent": "my-cinematek/1.0", "Accept": "application/rss+xml, application/xml"})
        try:
            with urlopen(request, timeout=15) as response:
                root = ET.fromstring(response.read())
        except (HTTPError, URLError, TimeoutError, ET.ParseError):
            return self.send_json({"error": "Letterboxd feed unavailable or private."}, 502)

        namespace = "{http://letterboxd.com/ns/}"
        known_sources = db.watched_source_urls()
        known_film_ids, known_film_titles = db.watched_film_keys()
        imported = 0
        skipped = 0
        for item in root.findall("./channel/item"):
            source_url = (item.findtext("link") or item.findtext("guid") or "").strip()
            if not source_url or source_url in known_sources:
                skipped += 1
                continue
            title = (item.findtext(f"{namespace}filmTitle") or "").strip()
            if not title:
                title = (item.findtext("title") or "Film sans titre").split(" - ", 1)[0].strip()
            year = (item.findtext(f"{namespace}filmYear") or "").strip()
            watched_date = (item.findtext(f"{namespace}watchedDate") or "").strip()
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", watched_date):
                try:
                    watched_date = parsedate_to_datetime(item.findtext("pubDate", "")).date().isoformat()
                except (TypeError, ValueError, OverflowError):
                    skipped += 1
                    continue
            member_rating = (item.findtext(f"{namespace}memberRating") or "").strip()
            try:
                rating = float(member_rating) if member_rating else None
            except ValueError:
                rating = None
            tmdb_id = (item.findtext(f"{namespace}tmdbMovieId") or item.findtext("tmdbMovieId") or "").strip()
            film = {"title": title, "year": year, "poster": ""}
            if tmdb_id.isdigit():
                film["id"] = int(tmdb_id)
            if (tmdb_id and tmdb_id in known_film_ids) or normalized_title(title) in known_film_titles:
                skipped += 1
                continue
            db.insert_watched({"date": watched_date, "venue": {"name": "Letterboxd", "location": source_url}, "rating": rating, "note": "", "rewatch": False, "film": film, "sourceUrl": source_url})
            known_sources.add(source_url)
            if tmdb_id:
                known_film_ids.add(tmdb_id)
            known_film_titles.add(normalized_title(title))
            imported += 1
        return self.send_json({"username": username, "imported": imported, "skipped": skipped})

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, body, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"Starting my-cinematek on port {port}...", flush=True)
    ThreadingHTTPServer(("", port), CinematekHandler).serve_forever()
