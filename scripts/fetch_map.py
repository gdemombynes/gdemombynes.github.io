#!/usr/bin/env python3
"""Build assets/map/world.svg from Natural Earth 110m land polygons (public domain).

Projection: plate carrée (equirectangular). viewBox 0 0 1000 500, so
x = (lon + 180) / 360 * 1000 and y = (90 - lat) / 180 * 500.
The site's figures.js uses the same formulas to place markers.
"""
import json, sys, urllib.request, pathlib

SRC = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson"
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "map" / "world.svg"
W, H = 1000, 500

def proj(lon, lat):
    return (lon + 180) / 360 * W, (90 - lat) / 180 * H

def ring_to_path(ring):
    pts = [proj(lon, lat) for lon, lat, *_ in ring]
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else SRC
    if src.startswith("http"):
        with urllib.request.urlopen(src, timeout=60) as r:
            data = json.load(r)
    else:
        data = json.load(open(src))
    d = []
    for f in data["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            # skip Antarctica-sized polygons below 60S to keep the map compact
            if all(lat < -60 for _, lat, *_ in poly[0]):
                continue
            for ring in poly:
                d.append(ring_to_path(ring))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
           f'preserveAspectRatio="xMidYMid meet">\n'
           f'<path class="land" fill-rule="evenodd" d="{" ".join(d)}"/>\n</svg>\n')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(svg)
    print(f"wrote {OUT} ({OUT.stat().st_size//1024} KB, {len(d)} rings)")

if __name__ == "__main__":
    main()
