# my-cinematek

A personal film journal for publishing reviews and keeping a lightweight log of films watched. The public site is read-only; there are no reader accounts or comments.

## Features

- Publish and edit reviews with a rating, viewing context, conclusion, film details, and captioned photos.
- Mark spoiler passages with `[spoiler]...[/spoiler]` in a review or conclusion; readers can reveal passages individually or all at once.
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

## Public API (GET routes)

The app exposes a small public JSON API for read-only access. These endpoints are designed for GET requests and return JSON payloads that match the data used by the site.

### Reviews

- `GET /api/posts?limit=8&offset=0` — list recent reviews.
- `GET /api/posts/{id}` — fetch a single review by ID.

Example response from `GET /api/posts/42`:

```json
{
  "id": 42,
  "title": "The Green Knight",
  "movieTitle": "The Green Knight",
  "date": "2026-10-14",
  "rating": 4.5,
  "context": "Late-night screening with friends",
  "venue": {
    "name": "Canal 13",
    "city": "Paris"
  },
  "tags": ["fantasy", "arthurian"],
  "body": "A strange and haunting film...",
  "conclusion": "A beautiful, unsettling watch.",
  "film": {
    "id": 12345,
    "title": "The Green Knight",
    "poster_path": "/xyz.jpg"
  },
  "photos": [
    "https://example.com/photos/green-knight-1.jpg"
  ]
}
```

### Watched films

- `GET /api/watched?limit=8&offset=0` — list recent watched entries.

Example response:

```json
[
  {
    "id": 7,
    "date": "2026-10-15",
    "venue": {
      "name": "Cinéma du Parc"
    },
    "rating": 4,
    "note": "Great pacing and soundtrack.",
    "rewatch": false,
    "film": {
      "id": 54321,
      "title": "Arrival"
    },
    "sourceUrl": ""
  }
]
```

### Film metadata and search

- `GET /api/search?query=arrival` — search for a film via TMDB.
- `GET /api/movie?id=264114` — fetch a film's details by TMDB ID.
- `GET /api/places?query=paris` — search nearby places or venue data.
- `GET /api/poster?url=https://image.tmdb.org/t/p/w500/....jpg` — proxy a poster image from TMDB.

These endpoints are useful when you want to build a public-facing frontend, sync external tools, or embed a simple data feed without exposing admin actions.

## Render deployment

The repository includes a Render blueprint in `render.yaml`. Add a PostgreSQL database and configure `DATABASE_URL`, `TMDB_API_KEY`, and `AUTHOR_PASSWORD` as service environment variables. The app refuses to start on Render without `DATABASE_URL`.

## Nix deployment

The flake provides a runnable package and a NixOS module. The module runs as a dynamic unprivileged user. Configure `DATABASE_URL` to use an existing PostgreSQL database such as Neon; SQLite in `/var/lib/my-cinematek` is only the fallback when `DATABASE_URL` is unset.

Add the repository as a flake input and enable the module in your NixOS configuration:

```nix
{
	inputs = {
		nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
		my-cinematek.url = "github:YOUR-USER/my-cinematek";
	};

	outputs = { self, nixpkgs, my-cinematek, ... }: {
		nixosConfigurations.YOUR-HOST = nixpkgs.lib.nixosSystem {
			system = "x86_64-linux";
			modules = [
				my-cinematek.nixosModules.default
				({ ... }: {
					services.my-cinematek = {
						enable = true;
						port = 8000;
						environmentFile = "/run/secrets/my-cinematek.env";
					};
				})
			];
		};
	};
}
```

Create the environment file on the server, outside the Nix store, with restrictive permissions. It must define `AUTHOR_PASSWORD` and your Neon `DATABASE_URL`; `TMDB_API_KEY` is optional for film search and details. Use the connection string from Neon and ensure it includes `sslmode=require`. For example:

```sh
AUTHOR_PASSWORD=choose-a-private-password
TMDB_API_KEY=your-key-here
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

The app connects to Neon and initializes or updates its required tables at startup. Deploy with `sudo nixos-rebuild switch --flake .#YOUR-HOST`. Put a reverse proxy with HTTPS in front of the service for public access.

For a one-off run without the NixOS module, use `nix run github:YOUR-USER/my-cinematek`. It uses Neon when `DATABASE_URL` is set; otherwise, it stores SQLite under `$XDG_DATA_HOME/my-cinematek` or `~/.local/share/my-cinematek`, overridable with `SQLITE_PATH`.
