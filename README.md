# gdemombynes.github.io

Personal site of Gabriel Demombynes. A static, single-page site with no build step.

## Editing content

Everything on the page is rendered from the JSON files in `data/`:

| File | What it holds |
|---|---|
| `data/site.json` | Bio, experience, education, leadership items, places (with coordinates), the Millennium Villages timeline |
| `data/papers.json` | Papers, books, and reports (`countries` and `collections` decide which sections show them) |
| `data/posts.json` | Blog posts and op-eds |
| `data/media.json` | Podcasts, interviews, events |
| `data/figures.json` | The numbers behind the inline charts, with sources |

Add a paper by adding an object to `papers.json` (copy an existing one). Set `countries` to any of
`colombia`, `philippines`, `vietnam`, `kenya`, `latam` to have it appear in that place's section, and
`collections` to `["mvp"]` or `["ai"]` for those sections. Validate with `python3 -m json.tool data/papers.json`.

## Running locally

The page loads its data with `fetch()`, so it must be served over HTTP:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from the file system will not work.

## Scripts

- `python3 scripts/fetch_covers.py` downloads cover thumbnails from the World Bank Open Knowledge
  Repository into `assets/covers/` and writes the paths into `papers.json`. Papers without a cover get a
  typographic card. Use `--only ID` or `--force`.
- `python3 scripts/fetch_map.py` rebuilds `assets/map/world.svg` from Natural Earth 110m land polygons
  (equirectangular projection, viewBox 1000×500).
- `python3 scripts/check_links.py` checks every URL in `data/*.json`. Some publishers (Elsevier, SSRN,
  Taylor & Francis, CGD, LinkedIn) return 403 or 999 to scripts but work in a browser.
- `python3 scripts/find_episodes.py` lists Hello Future podcast episodes that mention Gabriel.

## Deploying

The site is published by GitHub Pages from the `main` branch of `gdemombynes/gdemombynes.github.io`.
Commit and push; Pages redeploys within a minute or two.

## Photos

To add a portrait, put the file at `assets/photo/headshot.jpg` and set `"photo": "assets/photo/headshot.jpg"`
in `data/site.json`. Until then the hero shows a map plate.
