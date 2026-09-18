// Inline SVG figures built from data/figures.json, plus the places map and career timeline.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function svgRoot(w, h, title, desc) {
    const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", class: "chart", "aria-labelledby": null });
    const t = el("title", {}, title); s.appendChild(t);
    if (desc) s.appendChild(el("desc", {}, desc));
    return s;
  }
  function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

  // Simple horizontal bars: series[0].points = [[label, value], ...]
  function barChart(f) {
    const pts = f.series[0].points, W = 640, rowH = 42, left = 215, right = 70, top = 8;
    const H = top + pts.length * rowH + 8;
    const max = Math.max(...pts.map(p => p[1])) * 1.08;
    const s = svgRoot(W, H, f.title, f.note || f.unit);
    pts.forEach((p, i) => {
      const y = top + i * rowH;
      const w = (W - left - right) * p[1] / max;
      s.appendChild(el("text", { x: left - 12, y: y + 25, "text-anchor": "end", class: "lab" }, p[0]));
      s.appendChild(el("rect", { x: left, y: y + 10, width: w, height: 20, class: i === pts.length - 1 ? "s1" : "s0" }));
      s.appendChild(el("text", { x: left + w + 8, y: y + 25, class: "val" }, fmt(p[1])));
    });
    s.appendChild(el("line", { x1: left, y1: top, x2: left, y2: H - 8, class: "axis" }));
    return s;
  }

  // Line chart: series[0].points = [[x, y], ...]
  function lineChart(f) {
    const pts = f.series[0].points, W = 640, H = 320, L = 56, R = 30, T = 24, B = 44;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), ymax = f.ymax || Math.ceil(Math.max(...ys) * 1.15 / 20) * 20;
    const X = x => L + (x - x0) / (x1 - x0) * (W - L - R);
    const Y = y => T + (1 - y / ymax) * (H - T - B);
    const s = svgRoot(W, H, f.title, f.note || f.unit);
    const step = ymax <= 40 ? 10 : 20;
    for (let g = 0; g <= ymax; g += step) {
      s.appendChild(el("line", { x1: L, y1: Y(g), x2: W - R, y2: Y(g), class: g === 0 ? "axis" : "grid" }));
      s.appendChild(el("text", { x: L - 8, y: Y(g) + 4, "text-anchor": "end", class: "val lab" }, g));
    }
    xs.forEach(x => s.appendChild(el("text", { x: X(x), y: H - B + 20, "text-anchor": "middle", class: "val lab" }, x)));
    const d = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
    s.appendChild(el("path", { d, class: "line" }));
    pts.forEach(p => {
      s.appendChild(el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 4.5, class: "pt" }));
      s.appendChild(el("text", { x: X(p[0]), y: Y(p[1]) - 11, "text-anchor": "middle", class: "val" }, fmt(p[1])));
    });
    return s;
  }

  // Grouped bars: categories[], series[{label, points[]}]; null = not available
  function groupedBar(f, opts) {
    const cats = f.categories, ser = f.series, W = 640, H = 330, L = 56, R = 20, T = 34, B = 70;
    const vals = ser.flatMap(x => x.points).filter(v => v != null);
    const ymax = Math.ceil(Math.max(...vals) * 1.15 / 10) * 10;
    const gw = (W - L - R) / cats.length, bw = Math.min(46, gw / (ser.length + 1));
    const Y = y => T + (1 - y / ymax) * (H - T - B);
    const s = svgRoot(W, H, f.title, f.note || f.unit);
    for (let g = 0; g <= ymax; g += 10) {
      s.appendChild(el("line", { x1: L, y1: Y(g), x2: W - R, y2: Y(g), class: g === 0 ? "axis" : "grid" }));
      if (g % 20 === 0) s.appendChild(el("text", { x: L - 8, y: Y(g) + 4, "text-anchor": "end", class: "val lab" }, g));
    }
    cats.forEach((c, ci) => {
      const gx = L + ci * gw + gw / 2;
      ser.forEach((sv, si) => {
        const v = sv.points[ci];
        const x = gx - (ser.length * bw) / 2 + si * bw + 2;
        if (v == null) {
          s.appendChild(el("rect", { x, y: Y(ymax * 0.12), width: bw - 4, height: Y(0) - Y(ymax * 0.12), class: "na" }));
          s.appendChild(el("text", { x: x + (bw - 4) / 2, y: Y(0) - 8, "text-anchor": "middle", class: "val lab" }, "n/a"));
        } else {
          const cls = opts && opts.redSecond && si === 1 ? "s-red" : (si === 0 ? "s0" : "s1");
          s.appendChild(el("rect", { x, y: Y(v), width: bw - 4, height: Y(0) - Y(v), class: cls }));
          s.appendChild(el("text", { x: x + (bw - 4) / 2, y: Y(v) - 6, "text-anchor": "middle", class: "val" }, fmt(v)));
        }
      });
      const words = c.split(" ");
      const t = el("text", { x: gx, y: H - B + 18, "text-anchor": "middle", class: "lab" });
      // wrap onto two lines when long
      if (c.length > 16 && words.length > 1) {
        const half = Math.ceil(words.length / 2);
        t.appendChild(el("tspan", { x: gx, dy: 0 }, words.slice(0, half).join(" ")));
        t.appendChild(el("tspan", { x: gx, dy: 17 }, words.slice(half).join(" ")));
      } else t.textContent = c;
      s.appendChild(t);
    });
    // legend
    ser.forEach((sv, si) => {
      const lx = L + si * 270, ly = 14;
      const cls = opts && opts.redSecond && si === 1 ? "s-red" : (si === 0 ? "s0" : "s1");
      s.appendChild(el("rect", { x: lx, y: ly - 11, width: 14, height: 14, class: cls }));
      s.appendChild(el("text", { x: lx + 20, y: ly + 1, class: "legend" }, sv.label));
    });
    return s;
  }

  function figure(id, data, num) {
    const f = data[id];
    if (!f) return null;
    const fig = document.createElement("figure");
    fig.className = "fig";
    const h = document.createElement("div"); h.className = "fig-h";
    const b = document.createElement("b"); b.textContent = "Figure " + num; h.appendChild(b);
    h.appendChild(document.createTextNode(f.title)); fig.appendChild(h);
    const u = document.createElement("div"); u.className = "fig-unit"; u.textContent = f.unit; fig.appendChild(u);
    let svg;
    if (f.type === "bar") svg = barChart(f);
    else if (f.type === "line") svg = lineChart(f);
    else if (f.type === "grouped-bar") svg = groupedBar(f);
    else if (f.type === "paired-bar") svg = groupedBar(f, { redSecond: false });
    fig.appendChild(svg);
    const cap = document.createElement("figcaption");
    cap.textContent = f.note || "";
    const src = document.createElement("span"); src.className = "src"; src.textContent = "Source: " + f.source;
    cap.appendChild(src); fig.appendChild(cap);
    return fig;
  }

  // ---- Places map (equirectangular, viewBox 0 0 1000 500, same projection as scripts/fetch_map.py)
  const W = 1000, H = 500;
  const proj = (lon, lat) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];

  let LAND = null;
  async function landPath() {
    if (LAND !== null) return LAND;
    LAND = "";
    try {
      const r = await fetch("assets/map/world.svg");
      if (r.ok) { const m = (await r.text()).match(/d="([^"]+)"/); LAND = m ? m[1] : ""; }
    } catch (e) {}
    return LAND;
  }
  function landUse() {
    if (!LAND) return null;
    if (!document.getElementById("worldland")) {
      const defs = el("svg", { id: "land-defs", width: 0, height: 0, "aria-hidden": "true", style: "position:absolute;width:0;height:0" });
      const d = el("defs", {}); d.appendChild(el("path", { id: "worldland", d: LAND, "fill-rule": "evenodd" })); defs.appendChild(d);
      document.body.appendChild(defs);
    }
    return el("use", { href: "#worldland", class: "land" });
  }
  // Chronological route between postings: [place id, year of arrival]
  const ROUTE = [["dc", 2005], ["kenya", 2009], ["vietnam", 2013], ["philippines", 2016], ["colombia", 2020], ["dc", 2023]];
  function arc(a, b, bulge) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const cx = mx + nx * len * bulge, cy = my + ny * len * bulge;
    return { d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`, mid: [0.25 * a[0] + 0.5 * cx + 0.25 * b[0], 0.25 * a[1] + 0.5 * cy + 0.25 * b[1]] };
  }
  function drawRoute(s, places, projFn) {
    const byId = Object.fromEntries(places.map(p => [p.id, p]));
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const A = byId[ROUTE[i][0]], B = byId[ROUTE[i + 1][0]];
      if (!A || !B) continue;
      const a = projFn(A.lon, A.lat), b = projFn(B.lon, B.lat);
      const { d, mid } = arc(a, b, i % 2 ? -0.18 : 0.18);
      s.appendChild(el("path", { d, class: "route" }));
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 80) s.appendChild(el("text", { x: mid[0], y: mid[1] + (i % 2 ? 14 : -6), class: "route-yr", "text-anchor": "middle" }, ROUTE[i + 1][1]));
    }
  }

  async function placesMap(places) {
    const land = await landPath();
    // crop the view to the inhabited world (roughly 60S to 75N)
    const y0 = proj(0, 78)[1], y1 = proj(0, -58)[1];
    const s = el("svg", { viewBox: `0 ${y0.toFixed(0)} ${W} ${(y1 - y0).toFixed(0)}`, class: "map", role: "img" });
    s.appendChild(el("title", {}, "World map showing the places where Gabriel Demombynes has worked"));
    s.appendChild(el("desc", {}, "Markers for Bogotá, Manila, Hanoi, Nairobi, and Washington, DC, with a dotted outline around Latin America. Each marker links to the corresponding section."));
    for (let lon = -180; lon <= 180; lon += 30) { const [x] = proj(lon, 0); s.appendChild(el("line", { x1: x, y1: y0, x2: x, y2: y1, class: "grat" })); }
    for (let lat = -60; lat <= 60; lat += 30) { const [, y] = proj(0, lat); s.appendChild(el("line", { x1: 0, y1: y, x2: W, y2: y, class: "grat" })); }
    if (land) s.appendChild(landUse());
    drawRoute(s, places, proj);
    // Latin America region: dotted outline (rough polygon of the region)
    const region = [[-118, 33], [-96, 33], [-84, 20], [-59, 20], [-34, -6], [-38, -20], [-52, -38], [-64, -56], [-76, -50], [-80, -20], [-84, 0], [-98, 12], [-118, 22]];
    s.appendChild(el("path", { d: region.map((p, i) => (i ? "L" : "M") + proj(p[0], p[1]).map(v => v.toFixed(1)).join(" ")).join(" ") + "Z", class: "region" }));
    const la = proj(-95, -35);
    s.appendChild(el("text", { x: la[0], y: la[1], class: "lbl" }, "05 · Latin America"));
    places.filter(p => !p.regional).forEach(p => {
      const [x, y] = proj(p.lon, p.lat);
      const g = el("a", { href: "#" + (p.nav === false ? "about" : p.id), class: "mk" + (p.current ? " cur" : ""), "aria-label": p.label + (p.nav === false ? " (current, see About)" : " section"), style: p.color ? `--place: ${p.color}` : null });
      g.appendChild(el("circle", { cx: x, cy: y, r: 11 }));
      if (p.n) g.appendChild(el("text", { x, y: y + 3, class: "n" }, p.n.replace(/^0/, "")));
      const right = p.labelLeft ? false : p.lon < 60;
      const t = el("text", { x: right ? x + 13 : x - 13, y: y + 4, class: "city", "text-anchor": right ? "start" : "end" }, p.city + (p.current ? " (now)" : ""));
      g.appendChild(t);
      s.appendChild(g);
    });
    return s;
  }

  // ---- Locator mini-map for a country section (crop of the world map around the place)
  async function locator(p) {
    const land = await landPath();
    const span = p.regional ? 62 : 34;                 // degrees of longitude shown
    const cx = p.regional ? -78 : p.lon, cy = p.regional ? -12 : p.lat;
    const w = span / 360 * W, hgt = w * 0.78;
    const [px, py] = proj(cx, cy);
    const x0 = px - w / 2, y0 = py - hgt / 2;
    const s = el("svg", { viewBox: `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${hgt.toFixed(1)}`, class: "map locator", role: "img", style: p.color ? `--place: ${p.color}` : null });
    s.appendChild(el("title", {}, "Map showing " + p.label));
    s.appendChild(el("rect", { x: x0, y: y0, width: w, height: hgt, class: "sea" }));
    for (let lon = -180; lon <= 180; lon += 10) { const [x] = proj(lon, 0); s.appendChild(el("line", { x1: x, y1: y0, x2: x, y2: y0 + hgt, class: "grat" })); }
    for (let lat = -80; lat <= 80; lat += 10) { const [, y] = proj(0, lat); s.appendChild(el("line", { x1: x0, y1: y, x2: x0 + w, y2: y, class: "grat" })); }
    if (land) s.appendChild(landUse());
    if (p.regional) {
      const region = [[-118, 33], [-96, 33], [-84, 20], [-59, 20], [-34, -6], [-38, -20], [-52, -38], [-64, -56], [-76, -50], [-80, -20], [-84, 0], [-98, 12], [-118, 22]];
      s.appendChild(el("path", { d: region.map((q, i) => (i ? "L" : "M") + proj(q[0], q[1]).map(v => v.toFixed(1)).join(" ")).join(" ") + "Z", class: "region" }));
    } else {
      const [x, y] = proj(p.lon, p.lat);
      s.appendChild(el("circle", { cx: x, cy: y, r: 7, class: "halo" }));
      s.appendChild(el("circle", { cx: x, cy: y, r: 3.2, class: "dot" }));
      s.appendChild(el("text", { x: x + 6, y: y - 5, class: "city" }, p.city));
    }
    return s;
  }

  // ---- Career timeline (horizontal bars by year)
  function careerTimeline(exp) {
    const y0 = 2003, y1 = 2027, W = 900, rowH = 30, L = 8, R = 8, T = 28;
    const rows = exp.filter(e => e.start >= y0 - 1);
    const H = T + rows.length * rowH + 10;
    const X = y => L + (y - y0) / (y1 - y0) * (W - L - R);
    const s = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "tl-svg", role: "img" });
    s.appendChild(el("title", {}, "Career timeline, 2003 to present"));
    s.appendChild(el("desc", {}, rows.map(e => `${e.role}, ${e.city}, ${e.start} to ${e.end || "present"}`).join("; ")));
    for (let y = 2004; y <= 2026; y += 2) {
      s.appendChild(el("line", { x1: X(y), y1: T - 6, x2: X(y), y2: H - 6, class: "tick" }));
      s.appendChild(el("text", { x: X(y), y: 12, "text-anchor": "middle" }, y));
    }
    rows.forEach((e, i) => {
      const y = T + i * rowH;
      const start = X(e.start), end = X(e.end == null ? 2026.7 : (e.end === e.start ? e.end + 0.9 : e.end));
      const w = Math.max(end - start, 6);
      s.appendChild(el("rect", { x: start, y: y + 6, width: w, height: 16, class: "bar" + (i % 2 ? " alt" : "") }));
      const role = e.role.replace("Poverty Reduction and Economic Management", "PREM").replace("Latin America and the Caribbean Poverty Group", "LAC Poverty Group");
      const label = (e.n ? e.n + " " : "") + e.city + " · " + role;
      const labelW = label.length * 8.2;
      const fits = w > labelW;
      const leftSide = !fits && end + 8 + labelW > W && start - 8 - labelW >= 0;
      s.appendChild(el("text", { x: fits ? start + 6 : (leftSide ? start - 8 : end + 8), y: y + 18, class: "lbl", "text-anchor": fits ? "start" : (leftSide ? "end" : "start"), fill: fits ? "var(--paper)" : null }, label));
    });
    return s;
  }

  // ---- Hero plate (graticule + markers + monogram) used when there is no portrait
  function heroPlate(places) {
    const s = el("svg", { viewBox: "0 0 400 400", class: "map", role: "img" });
    s.appendChild(el("title", {}, "Graticule with markers for Bogotá, Manila, Hanoi, Nairobi, and Washington"));
    for (let i = 0; i <= 8; i++) {
      s.appendChild(el("line", { x1: 0, y1: i * 50, x2: 400, y2: i * 50, class: "grat" }));
      s.appendChild(el("line", { x1: i * 50, y1: 0, x2: i * 50, y2: 400, class: "grat" }));
    }
    // a globe-like ellipse set
    for (const rx of [60, 120, 180]) s.appendChild(el("ellipse", { cx: 200, cy: 200, rx, ry: 180, class: "grat" }));
    s.appendChild(el("ellipse", { cx: 200, cy: 200, rx: 180, ry: 180, class: "grat" }));
    for (const ry of [60, 120]) s.appendChild(el("ellipse", { cx: 200, cy: 200, rx: 180, ry, class: "grat" }));
    const pp = (lon, lat) => [200 + (lon / 180) * 175, 200 - (lat / 90) * 150];
    drawRoute(s, places, pp);
    places.filter(p => !p.regional).forEach(p => {
      const [x, y] = pp(p.lon, p.lat);
      const g = el("g", { class: "mk" + (p.current ? " cur" : ""), style: p.color ? `--place: ${p.color}` : null });
      g.appendChild(el("circle", { cx: x, cy: y, r: 7 }));
      g.appendChild(el("text", { x: x + 12, y: y + 5, class: "city", style: "font-size:19px" }, p.city));
      s.appendChild(g);
    });
    const m = el("text", { x: 22, y: 380, class: "lbl" }, "G · D");
    m.setAttribute("style", "font-family: var(--serif); font-size: 26px; fill: var(--ink); letter-spacing: .2em;");
    s.appendChild(m);
    return s;
  }

  window.FIG = { figure, placesMap, careerTimeline, heroPlate, locator };
})();
