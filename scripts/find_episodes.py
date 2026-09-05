#!/usr/bin/env python3
"""List Hello Future podcast episodes featuring Gabriel Demombynes.

Looks up the show's RSS feed through the Apple Podcasts lookup API, then prints
every item whose title or description mentions him (or the World Bank / Human
Capital), so data/media.json can be updated by hand.
"""
import json, re, sys, urllib.request, xml.etree.ElementTree as ET

APPLE_ID = "1842931660"
PATTERN = re.compile(r"Demombynes|World Bank|Human Capital", re.I)

def main():
    with urllib.request.urlopen(f"https://itunes.apple.com/lookup?id={APPLE_ID}", timeout=30) as r:
        feed = json.load(r)["results"][0]["feedUrl"]
    with urllib.request.urlopen(feed, timeout=60) as r:
        root = ET.parse(r).getroot()
    it_ns = "{http://www.itunes.com/dtds/podcast-1.0.dtd}"
    n = 0
    for item in root.iter("item"):
        title = item.findtext("title") or ""
        desc = re.sub("<[^>]+>", "", (item.findtext("description") or ""))
        if PATTERN.search(title + " " + desc):
            n += 1
            print(f"{item.findtext('pubDate')}\n  {title}\n  {item.findtext('link')}\n  {item.findtext(it_ns + 'duration')} s\n  {desc[:200]}\n")
    print(f"{n} matching episode(s)")

if __name__ == "__main__":
    main()
