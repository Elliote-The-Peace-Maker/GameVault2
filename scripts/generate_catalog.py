"""Generate the GameVault GTA catalog seed and direct game pages.

The JSON catalog is the source of truth. This deliberately allows a short,
accurate franchise catalog instead of padding an arbitrary game-count target.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLATFORMS = {
    "pc": "Windows PC", "ps1": "PlayStation", "ps2": "PlayStation 2",
    "ps3": "PlayStation 3", "ps4": "PlayStation 4", "ps5": "PlayStation 5",
    "xbox": "Xbox Series X|S", "xboxone": "Xbox One", "xbox360": "Xbox 360",
    "dreamcast": "Dreamcast", "gbc": "Game Boy Color", "gba": "Game Boy Advance",
    "psp": "PlayStation Portable", "ds": "Nintendo DS", "switch": "Nintendo Switch",
    "ios": "iOS", "android": "Android",
}


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    catalog_path = ROOT / "data/game-catalog.json"
    games = json.loads(catalog_path.read_text(encoding="utf-8"))
    if not games:
        raise SystemExit("The GTA catalog is empty.")
    slugs = [game["slug"] for game in games]
    if len(set(slugs)) != len(slugs):
        raise SystemExit("Duplicate GTA game slugs.")
    for game in games:
        game["franchise"] = "grand-theft-auto"
        unknown = set(game.get("platform_slugs", [])) - PLATFORMS.keys()
        if unknown:
            raise SystemExit(f"Unknown platforms for {game['title']}: {sorted(unknown)}")
    catalog_path.write_text(json.dumps(games, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    platform_slugs = sorted({slug for game in games for slug in game.get("platform_slugs", [])})
    lines = [
        "-- Curated GameVault GTA catalog only; this seed creates no accounts or activity.",
        "insert into public.platforms (slug, name) values",
    ]
    for index, slug in enumerate(platform_slugs):
        tail = "," if index < len(platform_slugs) - 1 else " on conflict (slug) do update set name = excluded.name;"
        lines.append(f"  ({sql(slug)}, {sql(PLATFORMS[slug])}){tail}")
    lines += [
        "",
        "insert into public.games (slug, title, genre, description, supported_platforms, catalog_note, is_upcoming, franchise) values",
    ]
    for index, game in enumerate(games):
        platform_array = "array[" + ", ".join(sql(x) for x in game.get("platform_slugs", [])) + "]::text[]"
        description = f"{game.get('setting', 'Grand Theft Auto')} · {game.get('year', '')}. {game['description']}".strip()
        upcoming = "true" if game.get("is_upcoming") else "false"
        tail = "," if index < len(games) - 1 else (
            " on conflict (slug) do update set title=excluded.title, genre=excluded.genre, "
            "description=excluded.description, supported_platforms=excluded.supported_platforms, "
            "catalog_note=excluded.catalog_note, is_upcoming=excluded.is_upcoming, franchise=excluded.franchise;"
        )
        lines.append(
            f"  ({sql(game['slug'])}, {sql(game['title'])}, {sql(game['genre'])}, "
            f"{sql(description)}, {platform_array}, {sql(game['catalog_note'])}, "
            f"{upcoming}, 'grand-theft-auto'){tail}"
        )
    lines += [
        "",
        "insert into public.game_platforms (game_id, platform_id)",
        "select g.id, p.id",
        "from public.games g",
        "cross join unnest(g.supported_platforms) as platform_slugs(slug)",
        "join public.platforms p on p.slug = platform_slugs.slug",
        "where g.franchise = 'grand-theft-auto'",
        "on conflict do nothing;",
        "",
    ]
    (ROOT / "supabase/seed.sql").write_text("\n".join(lines), encoding="utf-8")

    for game in games:
        directory = ROOT / "games" / game["slug"]
        directory.mkdir(parents=True, exist_ok=True)
        title = game["title"].replace("&", "&amp;")
        html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#10101a"><title>{title} · GameVault</title><link rel="icon" type="image/jpeg" href="/assets/game-vault-logo.jpeg"><link rel="stylesheet" href="/css/app.css"></head><body data-route="game-detail" data-slug="{game["slug"]}"><div data-app-shell></div><script type="module" src="/js/pages/game-detail.js"></script></body></html>'''
        (directory / "index.html").write_text(html, encoding="utf-8")
    print(f"Generated {len(games)} GTA catalog entries and {len(platform_slugs)} platform tags.")


if __name__ == "__main__":
    main()
