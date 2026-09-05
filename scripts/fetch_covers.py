#!/usr/bin/env python3
"""Download publication cover thumbnails into assets/covers/ and record them in data/papers.json.

Sources, in order:
  1. paper["cover_url"]   manual override, downloaded as-is
  2. paper["okr_handle"]  World Bank Open Knowledge Repository (DSpace 7 REST API)
  3. paper["okr_query"] or title   OKR full-text search, fuzzy-matched on title
  4. og:image of paper["url"]   marked cover_source "og" for manual review

Usage: python3 scripts/fetch_covers.py [--force] [--dry-run] [--only ID]
"""
import argparse, difflib, json, pathlib, re, sys, time, urllib.parse
import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "papers.json"
COVERS = ROOT / "assets" / "covers"
OKR = "https://openknowledge.worldbank.org/server/api"
UA = {"User-Agent": "gdemombynes-site cover fetcher (github.com/gdemombynes)"}
BROWSER_UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
S = requests.Session()

def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", (s or "").lower()).strip()

def okr_item_by_handle(handle):
    r = S.get(f"{OKR}/pid/find", params={"id": handle}, headers=UA, timeout=20)
    if r.status_code == 200:
        return r.json()
    return None

def okr_search(query, title, year):
    r = S.get(f"{OKR}/discover/search/objects", params={"query": query, "size": 8}, headers=UA, timeout=30)
    r.raise_for_status()
    objs = r.json()["_embedded"]["searchResult"]["_embedded"]["objects"]
    best, best_score = None, 0
    for o in objs:
        it = o["_embedded"]["indexableObject"]
        if it.get("type") != "item":
            continue
        score = difflib.SequenceMatcher(None, norm(it["name"]), norm(title)).ratio()
        issued = (it.get("metadata", {}).get("dc.date.issued") or [{}])[0].get("value", "")
        if issued.startswith(str(year)):
            score += 0.05
        if score > best_score:
            best, best_score = it, score
    if best and best_score >= 0.6:
        return best, best_score
    return None, best_score

def okr_thumbnail(uuid):
    r = S.get(f"{OKR}/core/items/{uuid}/thumbnail", headers=UA, timeout=20)
    if r.status_code != 200:
        return None
    return r.json()["_links"]["content"]["href"]

def download(url, dest, headers=UA):
    r = S.get(url, headers=headers, timeout=30, stream=True)
    if r.status_code != 200 or not r.headers.get("Content-Type", "").startswith("image/"):
        return False
    data = r.content
    if len(data) < 1024:
        return False
    dest.write_bytes(data)
    return True

def og_image(url):
    try:
        r = S.get(url, headers=BROWSER_UA, timeout=20)
    except requests.RequestException:
        return None
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', r.text, re.I)
    return m.group(1) if m else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only")
    args = ap.parse_args()
    papers = json.loads(DATA.read_text())
    COVERS.mkdir(parents=True, exist_ok=True)
    rows = []
    for p in papers:
        if args.only and p["id"] != args.only:
            continue
        dest = COVERS / f"{p['id']}.jpg"
        if dest.exists() and not args.force:
            p["cover"] = f"assets/covers/{p['id']}.jpg"
            rows.append((p["id"], "cached", "ok"))
            continue
        source, status, img = None, "none", None
        try:
            if p.get("cover_url"):
                source, img = "manual", p["cover_url"]
            else:
                item = None
                if p.get("okr_handle"):
                    item = okr_item_by_handle(p["okr_handle"])
                if item is None:
                    q = p.get("okr_query") or p["title"]
                    item, score = okr_search(q, p["title"], p["year"])
                    if item:
                        p["okr_handle"] = item["handle"]
                        p.setdefault("okr_match", round(score, 2))
                if item:
                    if not p.get("url"):
                        p["url"] = f"https://hdl.handle.net/{item['handle']}"
                    img = okr_thumbnail(item["uuid"])
                    source = "okr"
                if not img and p.get("url") and "worldbank" not in p["url"]:
                    img = og_image(p["url"])
                    source = "og" if img else None
            if img and not args.dry_run:
                if download(img, dest, headers=BROWSER_UA if source == "og" else UA):
                    p["cover"] = f"assets/covers/{p['id']}.jpg"
                    p["cover_source"] = source
                    status = "ok"
                else:
                    status = "download-failed"
            elif img:
                status = "would-download"
            if status != "ok":
                p["cover"] = None
        except requests.RequestException as e:
            status = f"error {e.__class__.__name__}"
            p["cover"] = None
        rows.append((p["id"], source or "-", status))
        time.sleep(0.5)
    if not args.dry_run:
        DATA.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
    w = max(len(r[0]) for r in rows)
    for r in rows:
        print(f"{r[0]:<{w}}  {r[1]:<7} {r[2]}")

if __name__ == "__main__":
    main()
