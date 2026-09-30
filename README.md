# my-cinematek

A personal film journal for publishing reviews and keeping a lightweight log of films watched. The public site is read-only; there are no reader accounts or comments.

## Features

- Publish and edit reviews with a rating, viewing context, conclusion, and film details.
- Browse the review archive by month, with a featured latest review.
- Log films without writing a full review, including a short note, rating, venue, and rewatch status.
- Search the film catalog and view film information through TMDB.
- Import watched films from a public Letterboxd RSS feed.
- Switch between French and original film titles.

## Requirements

- Python 3.10 or newer.
- A TMDB API key for film search and film details.
- A private author password for the admin area.

## Run locally

From the project root, set the environment variables and start the server.

### Linux and macOS

```bash
export TMDB_API_KEY="your-key-here"
export AUTHOR_PASSWORD="choose-a-private-password"
python3 server.py
```

### Windows PowerShell

```powershell
$env:TMDB_API_KEY = "your-key-here"
$env:AUTHOR_PASSWORD = "choose-a-private-password"
py server.py
```

Open the public site at http://localhost:8000. The `/admin.html` page is password-protected and is where you write reviews, log watched films, and sync Letterboxd.

## Data and integrations

- Reviews and watched entries use SQLite locally. Set `SQLITE_PATH` to choose a different SQLite file.
- When `DATABASE_URL` is set, the app uses PostgreSQL. The PostgreSQL driver is installed from `requirements.txt`.
- `TMDB_API_KEY` is used by the server-side TMDB proxy; it is not exposed in browser JavaScript.
- Set a private `AUTHOR_PASSWORD` before starting the app. The server checks it for author actions; it is not stored in the browser. The development fallback should not be used for a public deployment.

Get a TMDB API key from https://www.themoviedb.org/settings/api.

## Render deployment

The repository includes a Render blueprint in `render.yaml`. Add a PostgreSQL database and configure `DATABASE_URL`, `TMDB_API_KEY`, and `AUTHOR_PASSWORD` as service environment variables. The app refuses to start on Render without `DATABASE_URL`.
