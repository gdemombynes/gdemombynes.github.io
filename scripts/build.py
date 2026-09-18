#!/usr/bin/env python3
"""Build the publishable site from src/index.html and data/*.json.

Steps:
  1. Generate JSON-LD structured data (Person + publications) from the data files
     and inject it into the template at the <!--JSONLD--> marker.
  2. Pre-render the page with headless Chrome so crawlers and link previews get the
     full HTML (papers, posts, country sections) without running JavaScript.
     The JavaScript still runs in browsers and re-renders from data/*.json, so
     the page never goes stale for visitors even if this build is skipped.
  3. Write sitemap.xml and robots.txt.

Usage: python3 scripts/build.py            (run after editing anything in data/ or src/)
       python3 scripts/build.py --no-prerender   (skip Chrome; index.html = template + JSON-LD)
"""
import json, pathlib, re, subprocess, sys, time, socket, http.server, threading, functools, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_URL = "https://gdemombynes.github.io/"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def load(name):
    return json.loads((ROOT / "data" / f"{name}.json").read_text())

def jsonld():
    s, papers, posts = load("site"), load("papers"), load("posts")
    L = s["links"]
    person = {
        "@type": "Person", "@id": SITE_URL + "#person",
        "name": s["name"], "givenName": "Gabriel", "familyName": "Demombynes",
        "url": SITE_URL,
        "jobTitle": s["current_role"]["title"],
        "description": s["profile"],
        "worksFor": {"@type": "Organization", "name": "World Bank", "url": "https://www.worldbank.org/"},
        "alumniOf": [{"@type": "EducationalOrganization", "name": e["inst"] or e["degree"], "url": e.get("url")} for e in s["education"]],
        "knowsLanguage": s["languages"],
        "nationality": [{"@type": "Country", "name": c} for c in s["citizenship"]],
        "knowsAbout": ["Development economics", "Artificial intelligence and human capital", "Impact evaluation", "Poverty measurement", "Global health", "Colombia", "Philippines", "Vietnam", "Kenya", "Latin America"],
        "sameAs": [L["scholar"], L["linkedin"], L["github"], L["worldbank"], L["ideas"], L["wbblogs"]],
        "image": SITE_URL + "assets/media/china-daily-2024.jpg",
    }
    def work(p):
        w = {"@type": "ScholarlyArticle" if p["type"] in ("journal", "comment", "chapter") else "Report",
             "name": p["title"], "datePublished": str(p["year"]),
             "author": [{"@type": "Person", "@id": SITE_URL + "#person"}] + [{"@type": "Person", "name": c} for c in p.get("coauthors", [])]}
        if p.get("venue"): w["publisher"] = {"@type": "Organization", "name": p["venue"]}
        if p.get("url"): w["url"] = p["url"]
        if p.get("cover"): w["image"] = SITE_URL + p["cover"]
        if p.get("blurb"): w["abstract"] = p["blurb"]
        return w
    def article(x):
        return {"@type": "BlogPosting", "headline": x["title"], "datePublished": x["date"], "url": x["url"],
                "author": {"@type": "Person", "@id": SITE_URL + "#person"},
                "publisher": {"@type": "Organization", "name": x["outlet"]}}
    graph = [
        {"@type": "WebSite", "@id": SITE_URL + "#website", "url": SITE_URL, "name": s["name"], "inLanguage": "en",
         "about": {"@id": SITE_URL + "#person"}, "dateModified": s["updated"]},
        {"@type": "ProfilePage", "@id": SITE_URL, "url": SITE_URL, "mainEntity": {"@id": SITE_URL + "#person"},
         "isPartOf": {"@id": SITE_URL + "#website"}, "dateModified": s["updated"]},
        person,
        {"@type": "ItemList", "name": "Publications by Gabriel Demombynes",
         "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": work(p)} for i, p in enumerate(sorted(papers, key=lambda p: -p["year"]))]},
        {"@type": "ItemList", "name": "Articles and blog posts by Gabriel Demombynes",
         "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": article(x)} for i, x in enumerate(sorted(posts, key=lambda x: x["date"], reverse=True))]},
    ]
    doc = {"@context": "https://schema.org", "@graph": graph}
    return '<script type="application/ld+json">\n' + json.dumps(doc, ensure_ascii=False, indent=1).replace("</", "<\\/") + "\n</script>"

def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0)); return s.getsockname()[1]

def prerender(index_html):
    """Serve ROOT on a local port and dump the rendered DOM with headless Chrome."""
    port = free_port()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        out = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--virtual-time-budget=15000",
                              "--window-size=1280,1000", "--dump-dom", f"http://127.0.0.1:{port}/"],
                             capture_output=True, text=True, timeout=120).stdout
    finally:
        srv.shutdown()
    if "plist" not in out or "country" not in out:
        raise SystemExit("prerender failed: rendered DOM does not contain the papers list")
    # Post-process the dumped DOM.
    out = re.sub(r'<html([^>]*) data-theme="[^"]*"', r"<html\1", out, count=1)           # no baked-in theme
    out = out.replace('class="reveal"', 'class="reveal in"').replace('class="reveal in in"', 'class="reveal in"')
    out = re.sub(r'class="([^"]*\breveal\b)(?![^"]*\bin\b)([^"]*)"', r'class="\1 in\2"', out)  # visible without JS
    out = re.sub(r' aria-current="true"', "", out)                                          # scroll-spy state
    out = re.sub(r'<button class="theme-btn"[^>]*>[^<]*</button>', '<button class="theme-btn" type="button">Theme</button>', out)
    if not out.lstrip().lower().startswith("<!doctype"):
        out = "<!DOCTYPE html>\n" + out
    return out

def main():
    template = (ROOT / "src" / "index.html").read_text()
    if "<!--JSONLD-->" not in template:
        raise SystemExit("src/index.html is missing the <!--JSONLD--> marker")
    page = template.replace("<!--JSONLD-->", jsonld())
    (ROOT / "index.html").write_text(page)
    if "--no-prerender" not in sys.argv:
        if not pathlib.Path(CHROME).exists():
            print("Chrome not found; wrote index.html without pre-rendering"); 
        else:
            rendered = prerender(page)
            (ROOT / "index.html").write_text(rendered)
            print(f"index.html pre-rendered ({len(rendered)//1024} KB)")
    s = load("site")
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'  <url><loc>{SITE_URL}</loc><lastmod>{s["updated"]}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n'
        '</urlset>\n')
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}sitemap.xml\n")
    print("wrote sitemap.xml, robots.txt")

if __name__ == "__main__":
    main()
