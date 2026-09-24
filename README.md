# my-cinematek

A simple personal movie review website with a warm editorial feel and no public accounts or comments.

## Run locally

From the project root:

```bash
$env:TMDB_API_KEY = "your-key-here"
$env:AUTHOR_PASSWORD = "choose-a-private-password"
py server.py
```

Then open:

http://localhost:8000

The public site is read-only. Open `/admin.html` to sign in and write or edit critics.

## Notes

- Reviews are stored by the server, using local SQLite for development and PostgreSQL when `DATABASE_URL` is set.
- Film search uses TMDB through the local Python proxy so the API key is not placed in browser JavaScript.
- Get a TMDB API key from https://www.themoviedb.org/settings/api and set `TMDB_API_KEY` before starting the server.
- For Railway, add `DATABASE_URL`, `TMDB_API_KEY`, and `AUTHOR_PASSWORD` as service variables. Add a Railway PostgreSQL service and reference its `DATABASE_URL`.
- `AUTHOR_PASSWORD` is checked by the server; it is not stored in the browser code.
- `requirements.txt` installs the PostgreSQL driver during deployment.
