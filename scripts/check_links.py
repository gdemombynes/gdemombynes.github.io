#!/usr/bin/env python3
"""HEAD/GET-check every http(s) URL in data/*.json and print a status table."""
import json, pathlib, re, sys, time
import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

def urls():
    seen = set()
    for f in sorted((ROOT / "data").glob("*.json")):
        text = f.read_text()
        for u in re.findall(r'https?://[^"\s]+', text):
            if u not in seen:
                seen.add(u); yield f.name, u

def check(u):
    try:
        r = requests.head(u, headers=UA, timeout=20, allow_redirects=True)
        if r.status_code in (403, 405, 404, 500, 503):
            r = requests.get(u, headers=UA, timeout=25, allow_redirects=True, stream=True)
        return r.status_code
    except requests.RequestException as e:
        return e.__class__.__name__

def main():
    bad = 0
    for fname, u in urls():
        st = check(u)
        ok = isinstance(st, int) and st < 400
        if not ok: bad += 1
        print(f"{'ok ' if ok else 'BAD'} {st!s:<18} {fname:<12} {u}")
        time.sleep(0.2)
    print(f"\n{bad} problem link(s)")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
