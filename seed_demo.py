#!/usr/bin/env python3
"""Seed a throwaway database with fake entries to exercise the public page.

Usage:
    SQLITE_PATH=/tmp/opencode/demo.db python3 seed_demo.py
    SQLITE_PATH=/tmp/opencode/demo.db HOST=127.0.0.1 PORT=8787 python3 server.py

Never point this at my-cinematek.db: it clears the tables first.
"""

import os
import pathlib
import random
import sqlite3
import textwrap

POSTER_DIR = pathlib.Path(__file__).parent / "demo-posters"

# Poster palettes: (background, accent) pairs with a cinema feel.
PALETTES = [
    ("#2b1114", "#e06a4a"),
    ("#121d2b", "#6ea8d8"),
    ("#1d2412", "#a8c05a"),
    ("#241326", "#c07ad8"),
    ("#2b2411", "#e0b84a"),
    ("#111f1d", "#4ad8c0"),
    ("#2b1a11", "#e08a4a"),
    ("#1a1120", "#8a6ad8"),
    ("#201111", "#d85a5a"),
    ("#111418", "#9aa8b8"),
]


def poster_svg(title, year, palette):
    background, accent = palette
    words = textwrap.wrap(title.upper(), width=12)[:3]
    lines = "".join(
        f'<text x="40" y="{300 + index * 58}" font-family="Georgia,serif" '
        f'font-size="46" fill="#f4e9db" letter-spacing="-1">{word}</text>'
        for index, word in enumerate(words)
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="{accent}" stop-opacity="0.55"/>
      <stop offset="0.55" stop-color="{background}"/>
      <stop offset="1" stop-color="#070607"/>
    </linearGradient>
    <radialGradient id="h" cx="0.3" cy="0.18" r="0.7">
      <stop offset="0" stop-color="{accent}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="{accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="500" height="750" fill="url(#g)"/>
  <rect width="500" height="750" fill="url(#h)"/>
  <circle cx="370" cy="150" r="78" fill="none" stroke="{accent}" stroke-opacity="0.65" stroke-width="2"/>
  <circle cx="370" cy="150" r="52" fill="none" stroke="#f4e9db" stroke-opacity="0.22" stroke-width="1"/>
  <rect x="40" y="200" width="88" height="3" fill="{accent}"/>
  {lines}
  <text x="40" y="690" font-family="Helvetica,Arial,sans-serif" font-size="20"
        fill="#f4e9db" fill-opacity="0.55" letter-spacing="6">{year}</text>
  <rect x="0" y="0" width="500" height="750" fill="none" stroke="#f4e9db" stroke-opacity="0.08" stroke-width="2"/>
</svg>
"""


def write_posters(films):
    POSTER_DIR.mkdir(exist_ok=True)
    for index, film in enumerate(films):
        slug = film["slug"]
        path = POSTER_DIR / f"{slug}.svg"
        path.write_text(poster_svg(film["title"], film["year"], PALETTES[index % len(PALETTES)]), encoding="utf-8")


VENUES = [
    {"type": "cinema", "name": "Institut Lumière", "location": "https://www.openstreetmap.org/?mlat=45.7453857&mlon=4.8697489#map=18/45.7453857/4.8697489"},
    {"type": "cinema", "name": "Pathé Bellecour", "location": "https://www.openstreetmap.org/?mlat=45.7586907&mlon=4.8348800#map=18/45.7586907/4.8348800"},
    {"type": "cinema", "name": "Ciné Mourguet", "location": "https://www.openstreetmap.org/?mlat=45.7359223&mlon=4.8000792#map=18/45.7359223/4.8000792"},
    {"type": "cinema", "name": "Auditorium de Lyon", "location": ""},
    {"type": "home", "name": "Ma TV", "location": ""},
    {"type": "cinema", "name": "Halle Tony Garnier", "location": ""},
]

FILMS = [
    {"slug": "godzilla-minus-zero", "title": "Godzilla Minus Zero", "original": "ゴジラ マイナス ゼロ", "year": "2026",
     "director": "Takashi Yamazaki", "runtime": 132, "budget": 15000000,
     "genres": ["Science-fiction", "Drame"], "countries": ["Japon"],
     "cast": ["Ryunosuke Kamiki", "Minami Hamabe", "Yuki Yamada"],
     "tagline": "Le roi des monstres revient à ses origines.",
     "overview": "Dans un Japon dévasté de l'après-guerre, un ancien pilote kamikaze doit affronter une créature née des essais nucléaires."},
    {"slug": "the-witch", "title": "The Witch", "original": "The VVitch", "year": "2015",
     "director": "Robert Eggers", "runtime": 92, "budget": 4000000,
     "genres": ["Horreur", "Drame historique"], "countries": ["États-Unis", "Canada"],
     "cast": ["Anya Taylor-Joy", "Ralph Ineson", "Kate Dickie"],
     "tagline": "Wouldst thou like to live deliciously?",
     "overview": "Une famille puritaine bannie de sa colonie s'installe en lisière d'une forêt où rôde une présence maléfique."},
    {"slug": "metropolis", "title": "Metropolis", "original": "Metropolis", "year": "1927",
     "director": "Fritz Lang", "runtime": 153, "budget": 1300000,
     "genres": ["Science-fiction", "Muet"], "countries": ["Allemagne"],
     "cast": ["Brigitte Helm", "Alfred Abel", "Gustav Fröhlich"],
     "tagline": "Entre le cerveau et les mains, le cœur doit être le médiateur.",
     "overview": "Dans une cité futuriste divisée entre élites et ouvriers, le fils du maître découvre le monde souterrain."},
    {"slug": "digger", "title": "Digger", "original": "Digger", "year": "2026",
     "director": "Joseph Kosinski", "runtime": 148, "budget": 190000000,
     "genres": ["Drame", "Aventure"], "countries": ["États-Unis"],
     "cast": ["Tom Cruise", "Ana de Armas", "Brian Tyree Henry"],
     "tagline": "Creuser jusqu'à la vérité.",
     "overview": "Un foreur de tunnels accepte une mission impossible sous la mer de Barents."},
    {"slug": "the-road-home", "title": "The Road Home", "original": "我的父亲母亲", "year": "1999",
     "director": "Zhang Yimou", "runtime": 100, "budget": 1000000,
     "genres": ["Romance", "Drame"], "countries": ["Chine"],
     "cast": ["Zhang Ziyi", "Sun Honglei", "Zheng Hao"],
     "tagline": "Une ode à la beauté simple.",
     "overview": "Un homme revient au village natal pour les funérailles de son père et apprend l'histoire d'amour de ses parents."},
    {"slug": "notre-salut", "title": "Notre salut", "original": "Notre salut", "year": "2026",
     "director": "Alice Diop", "runtime": 118, "budget": 6500000,
     "genres": ["Drame", "Historique"], "countries": ["France"],
     "cast": ["Virginie Efira", "Reda Kateb", "Noée Abita"],
     "tagline": "Devoir de mémoire, mémoire du devoir.",
     "overview": "Deux générations se confrontent autour d'archives retrouvées dans une maison de famille."},
    {"slug": "resident-evil", "title": "Resident Evil", "original": "Resident Evil", "year": "2026",
     "director": "Zach Cregger", "runtime": 124, "budget": 90000000,
     "genres": ["Horreur", "Action"], "countries": ["États-Unis", "Japon"],
     "cast": ["Austin Abrams", "Kathryn Newton", "Jun Kunimura"],
     "tagline": "Bienvenue à Raccoon City.",
     "overview": "Une équipe spéciale enquête sur une série de disparitions liées à un laboratoire pharmaceutique."},
]

WATCHED_FILMS = [
    {"slug": "shin-godzilla", "title": "Shin Godzilla", "original": "シン・ゴジラ", "year": "2016",
     "director": "Hideaki Anno", "runtime": 120, "budget": 15000000,
     "genres": ["Science-fiction"], "countries": ["Japon"],
     "cast": ["Hiroki Hasegawa", "Yutaka Takenouchi", "Satomi Ishihara"],
     "tagline": "", "overview": "Une créature émerge de la baie de Tokyo et la bureaucratie japonaise s'affole."},
    {"slug": "sans-un-bruit", "title": "Sans un bruit", "original": "A Quiet Place", "year": "2018",
     "director": "John Krasinski", "runtime": 90, "budget": 17000000,
     "genres": ["Horreur", "Thriller"], "countries": ["États-Unis"],
     "cast": ["Emily Blunt", "John Krasinski", "Millicent Simmonds"],
     "tagline": "", "overview": "Une famille survit en silence face à des créatures attirées par le son."},
    {"slug": "hope", "title": "Hope", "original": "Hope", "year": "2026",
     "director": "Inconnu", "runtime": 157, "budget": 0,
     "genres": ["Comédie"], "countries": ["France"],
     "cast": [], "tagline": "", "overview": ""},
    {"slug": "exit-8", "title": "Exit 8", "original": "8番出口", "year": "2025",
     "director": "Genki Kawamura", "runtime": 95, "budget": 5000000,
     "genres": ["Thriller", "Mystère"], "countries": ["Japon"],
     "cast": ["Kazunari Ninomiya"], "tagline": "", "overview": "Un homme est piégé dans un couloir de métro qui se répète."},
    {"slug": "the-big-lebowski", "title": "The Big Lebowski", "original": "The Big Lebowski", "year": "1998",
     "director": "Joel Coen", "runtime": 117, "budget": 15000000,
     "genres": ["Comédie", "Policier"], "countries": ["États-Unis"],
     "cast": ["Jeff Bridges", "John Goodman", "Julianne Moore"],
     "tagline": "The Dude abides.", "overview": "Un homme tranquille est confondu avec un millionnaire homonyme."},
    {"slug": "tigre-et-dragon", "title": "Tigre & Dragon", "original": "臥虎藏龍", "year": "2000",
     "director": "Ang Lee", "runtime": 120, "budget": 17000000,
     "genres": ["Wuxia", "Romance"], "countries": ["Taïwan", "Chine"],
     "cast": ["Chow Yun-fat", "Michelle Yeoh", "Zhang Ziyi"],
     "tagline": "", "overview": "Deux guerriers traquent une épée volée et affrontent leurs sentiments."},
    {"slug": "the-grandmaster", "title": "The Grandmaster", "original": "一代宗師", "year": "2013",
     "director": "Wong Kar-wai", "runtime": 130, "budget": 38000000,
     "genres": ["Biopic", "Arts martiaux"], "countries": ["Hong Kong"],
     "cast": ["Tony Leung", "Zhang Ziyi"], "tagline": "", "overview": "La vie du maître d'arts martiaux Ip Man.", "no_poster": True},
    {"slug": "prisoners", "title": "Prisoners", "original": "Prisoners", "year": "2013",
     "director": "Denis Villeneuve", "runtime": 153, "budget": 46000000,
     "genres": ["Thriller", "Drame"], "countries": ["États-Unis"],
     "cast": ["Hugh Jackman", "Jake Gyllenhaal"], "tagline": "", "overview": "Deux fillettes disparaissent et un père perd patience.", "no_poster": True},
    {"slug": "perfect-days", "title": "Perfect Days", "original": "Perfect Days", "year": "2023",
     "director": "Wim Wenders", "runtime": 124, "budget": 5000000,
     "genres": ["Drame"], "countries": ["Japon", "Allemagne"],
     "cast": ["Kōji Yakusho"], "tagline": "", "overview": "Les journées d'un agent d'entretien de toilettes publiques à Tokyo."},
    {"slug": "la-haine", "title": "La Haine", "original": "La Haine", "year": "1995",
     "director": "Mathieu Kassovitz", "runtime": 98, "budget": 2500000,
     "genres": ["Drame"], "countries": ["France"],
     "cast": ["Vincent Cassel", "Hubert Koundé", "Saïd Taghmaoui"],
     "tagline": "Jusqu'ici tout va bien.", "overview": "Vingt-quatre heures dans la vie de trois jeunes de banlieue."},
]

LOREM_BODY = """On ne présente plus Godzilla, le roi des monstres, créature légendaire fondatrice du genre cinématographique des kaijus. Soixante-dix ans d'existence, plus d'une cinquantaine d'œuvres, et pourtant ce retour aux sources parvient encore à surprendre.

La reconstruction d'un Japon à genoux sert de toile de fond à une histoire de culpabilité intime. Le monstre n'est jamais qu'un prétexte, une métaphore ambulante que la mise en scène prend soin de ne jamais sur-expliquer.

[spoiler]La séquence du train suspendu au-dessus de la baie, où le protagoniste comprend qu'il devra sacrifier son propre appareil, constitue le sommet émotionnel du film.[/spoiler]

Techniquement, le travail sur le son mérite une mention particulière : le rugissement a été retravaillé à partir des bandes originales de 1954, puis passé dans un filtre analogique qui lui donne une texture métallique inédite.

Reste une interrogation sur le dernier acte, un peu trop résolu, un peu trop propre pour un film qui avait jusque-là cultivé l'ambiguïté avec tant de soin."""

SHORT_BODY = """Il y a des films qu'on aborde avec méfiance et qui finissent par vous désarmer complètement. Celui-ci fait partie de cette catégorie rare.

La photographie, signée d'un chef opérateur dont c'est le premier long métrage, travaille une lumière naturelle presque documentaire. Les intérieurs sont éclairés à la bougie, les extérieurs attendent l'heure bleue.

[spoiler]Le plan final, qui révèle que la narratrice était morte depuis le début, relit entièrement les deux heures précédentes.[/spoiler]

On ressort de la salle avec cette sensation d'avoir vu quelque chose de fragile et de nécessaire."""

MEDIUM_BODY = """Une projection en copie restaurée 4K, présentée par l'équipe de restauration, dans une salle comble qui applaudit au générique.

Le film n'a rien perdu de sa puissance formelle. Les décors expressionnistes, les foules mécanisées, la fameuse descente vers les machines : tout cela reste d'une modernité sidérante près d'un siècle plus tard.

Ce qui frappe davantage à cette vision-ci, c'est la partition. Jouée en direct par l'orchestre, elle transforme le spectacle en expérience physique. Les basses font vibrer les fauteuils pendant la séquence de l'inondation.

La naïveté politique du dénouement prête toujours à sourire, mais elle est touchante plutôt qu'agaçante. On pardonne beaucoup à un film qui a inventé autant de choses."""

CONCLUSIONS = [
    "Un retour aux sources maîtrisé, porté par une direction artistique impeccable. Le dernier acte déçoit légèrement, mais l'ensemble reste une réussite franche.",
    "Une œuvre qui installe durablement son malaise et refuse toute explication rassurante. À voir dans le noir complet.",
    "Un monument qu'il faut voir en salle au moins une fois, de préférence avec accompagnement musical live.",
    "Du spectacle grand format exécuté avec un sérieux inattendu. Le genre de film qui justifie encore l'existence des très grandes salles.",
    "Une merveille de délicatesse, construite sur presque rien et pourtant bouleversante de bout en bout.",
    "Un geste de cinéma politique nécessaire, malgré quelques lourdeurs dans l'écriture des dialogues.",
    "Correct sans plus. Les amateurs de la licence y trouveront leur compte, les autres resteront sur le quai.",
]

POST_TITLES = [
    "Le retour aux sources du monstre le plus célèbre du cinéma !",
    "« Wouldst thou like to live deliciously? » dit Lucifer",
    "« Entre le cerveau et les mains, le cœur c'est le médiateur »",
    "Tom Cruise propulsé vers son premier Oscar !",
    "Une ode à la beauté",
    "Devoir de mémoire, mémoire du devoir",
    "Meilleure adaptation de jeu-vidéo ?",
]

POST_DATES = ["2026-11-08", "2026-11-06", "2026-10-15", "2026-10-25", "2026-10-12", "2026-10-04", "2026-09-23"]
POST_RATINGS = [8.0, 9.0, 10.0, 9.5, 9.0, 8.5, 6.5]
POST_BODIES = [LOREM_BODY, SHORT_BODY, MEDIUM_BODY, SHORT_BODY, MEDIUM_BODY, LOREM_BODY, SHORT_BODY]
POST_CONTEXTS = [
    "Avant-première, salle comble",
    "Rétrospective horreur, séance de minuit",
    "Ciné-concert avec orchestre live",
    "",
    "Festival Lumière, copie restaurée",
    "Séance suivie d'un débat",
    "",
]

WATCHED_DATES = ["2026-11-11", "2026-11-08", "2026-10-29", "2026-10-19", "2026-10-18",
                 "2026-10-11", "2026-10-11", "2026-10-09", "2026-09-28", "2026-09-14"]
WATCHED_RATINGS = [8.0, 7.5, 4.5, 7.0, 9.5, 8.5, 5.0, 8.0, None, 9.0]
WATCHED_NOTES = [
    "Quand Godzilla rencontre Anno. Un Evangelion live-action grandeur nature sublimé par la désolation de l'ange atomique.",
    "",
    "Entre les tirades scatophiles, les effets spéciaux à gerber, une longueur insoutenable et une cohérence partie en vacances, ne restent que les trente premières minutes pour nous sustenter.",
    "",
    "Film de la cérémonie de clôture du festival Lumière 2026, en présence des frères Coen !",
    "Séance présentée par la légende Zhang Ziyi en personne !",
    "L'art du wuxia rencontre Wong Kar-wai dans un mélange chimérique qui peine à émouvoir.",
    "",
    "",
    "Revu pour la énième fois, toujours aussi tranchant.",
]
WATCHED_REWATCH = [False, True, False, False, True, False, False, True, False, True]


def film_payload(entry, index, poster=True):
    slug = entry["slug"]
    url = f"/demo-posters/{slug}.svg" if poster and not entry.get("no_poster") else ""
    return {
        "id": 900000 + index,
        "title": entry["title"],
        "originalTitle": entry["original"],
        "year": entry["year"],
        "releaseDate": f"{entry['year']}-06-15",
        "poster": url,
        "posterFr": url,
        "posterOriginal": url,
        "director": entry["director"],
        "cast": entry["cast"],
        "runtime": entry["runtime"],
        "budget": entry["budget"],
        "genres": entry["genres"],
        "countries": entry["countries"],
        "tagline": entry["tagline"],
        "overview": entry["overview"],
        "homepage": "https://example.com/film" if index % 3 == 0 else "",
    }


def main():
    db_path = os.environ.get("SQLITE_PATH")
    if not db_path:
        raise SystemExit("Set SQLITE_PATH to a throwaway file, e.g. /tmp/opencode/demo.db")
    if os.path.abspath(db_path) == os.path.abspath(os.path.join(os.path.dirname(__file__), "my-cinematek.db")):
        raise SystemExit("Refusing to overwrite my-cinematek.db")

    random.seed(7)
    write_posters(FILMS + WATCHED_FILMS)

    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    connection = sqlite3.connect(db_path)
    import json

    connection.execute(
        "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, "
        "movie_title TEXT NOT NULL, watched_date TEXT NOT NULL, rating REAL NOT NULL, context TEXT, "
        "venue TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL, body TEXT NOT NULL, "
        "conclusion TEXT NOT NULL DEFAULT '', film TEXT NOT NULL, photos TEXT NOT NULL DEFAULT '[]')"
    )
    connection.execute(
        "CREATE TABLE IF NOT EXISTS watched_films (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "watched_date TEXT NOT NULL, venue TEXT NOT NULL DEFAULT '', rating REAL, "
        "note TEXT NOT NULL DEFAULT '', rewatch INTEGER NOT NULL DEFAULT 0, film TEXT NOT NULL, "
        "source_url TEXT NOT NULL DEFAULT '')"
    )
    connection.execute("DELETE FROM posts")
    connection.execute("DELETE FROM watched_films")

    for index, entry in enumerate(FILMS):
        film = film_payload(entry, index)
        photos = []
        if index == 0:
            photos = [{"src": f"/demo-posters/{entry['slug']}.svg", "caption": "Le hall avant la séance", "afterParagraph": 2}]
        connection.execute(
            "INSERT INTO posts (title, movie_title, watched_date, rating, context, venue, tags, body, conclusion, film, photos) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (POST_TITLES[index], entry["title"], POST_DATES[index], POST_RATINGS[index],
             POST_CONTEXTS[index], json.dumps(VENUES[index % len(VENUES)]),
             json.dumps(["demo", entry["genres"][0].lower()]), POST_BODIES[index],
             CONCLUSIONS[index], json.dumps(film), json.dumps(photos)),
        )

    for index, entry in enumerate(WATCHED_FILMS):
        film = film_payload(entry, 100 + index)
        connection.execute(
            "INSERT INTO watched_films (watched_date, venue, rating, note, rewatch, film, source_url) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (WATCHED_DATES[index], json.dumps(VENUES[index % len(VENUES)]), WATCHED_RATINGS[index],
             WATCHED_NOTES[index], int(WATCHED_REWATCH[index]), json.dumps(film), ""),
        )

    connection.commit()
    posts = connection.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    watched = connection.execute("SELECT COUNT(*) FROM watched_films").fetchone()[0]
    connection.close()
    print(f"Seeded {db_path}: {posts} critiques, {watched} visionnages.")
    print(f"Posters written to {POSTER_DIR}")


if __name__ == "__main__":
    main()
