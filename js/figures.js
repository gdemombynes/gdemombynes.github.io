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
    const pts = f.series[0].points, W = 640, rowH = 40, left = 200, right = 64, top = 8;
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
    const x0 = Math.min(...xs), x1 = Math.max(...xs), ymax = Math.ceil(Math.max(...ys) * 1.15 / 20) * 20;
    const X = x => L + (x - x0) / (x1 - x0) * (W - L - R);
    const Y = y => T + (1 - y / ymax) * (H - T - B);
    const s = svgRoot(W, H, f.title, f.note || f.unit);
    for (let g = 0; g <= ymax; g += 20) {
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
      const lx = L + si * 240, ly = 14;
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

  async function placesMap(places) {
    let land = "";
    try {
      const r = await fetch("assets/map/world.svg");
      if (r.ok) { const m = (await r.text()).match(/d="([^"]+)"/); land = m ? m[1] : ""; }
    } catch (e) {}
    // crop the view to the inhabited world (roughly 60S to 75N)
    const y0 = proj(0, 78)[1], y1 = proj(0, -58)[1];
    const s = el("svg", { viewBox: `0 ${y0.toFixed(0)} ${W} ${(y1 - y0).toFixed(0)}`, class: "map", role: "img" });
    s.appendChild(el("title", {}, "World map showing the places where Gabriel Demombynes has worked"));
    s.appendChild(el("desc", {}, "Markers for Bogotá, Manila, Hanoi, Nairobi, and Washington, DC, with a dotted outline around Latin America. Each marker links to the corresponding section."));
    for (let lon = -180; lon <= 180; lon += 30) { const [x] = proj(lon, 0); s.appendChild(el("line", { x1: x, y1: y0, x2: x, y2: y1, class: "grat" })); }
    for (let lat = -60; lat <= 60; lat += 30) { const [, y] = proj(0, lat); s.appendChild(el("line", { x1: 0, y1: y, x2: W, y2: y, class: "grat" })); }
    if (land) s.appendChild(el("path", { d: land, class: "land", "fill-rule": "evenodd" }));
    // Latin America region: dotted outline (rough polygon of the region)
    const region = [[-118, 33], [-96, 33], [-84, 20], [-59, 20], [-34, -6], [-38, -20], [-52, -38], [-64, -56], [-76, -50], [-80, -20], [-84, 0], [-98, 12], [-118, 22]];
    s.appendChild(el("path", { d: region.map((p, i) => (i ? "L" : "M") + proj(p[0], p[1]).map(v => v.toFixed(1)).join(" ")).join(" ") + "Z", class: "region" }));
    const la = proj(-95, -35);
    s.appendChild(el("text", { x: la[0], y: la[1], class: "lbl" }, "05 · Latin America"));
    places.filter(p => !p.regional).forEach(p => {
      const [x, y] = proj(p.lon, p.lat);
      const g = el("a", { href: "#" + (p.nav === false ? "about" : p.id), class: "mk" + (p.current ? " cur" : ""), "aria-label": p.label + (p.nav === false ? " (current, see About)" : " section") });
      g.appendChild(el("circle", { cx: x, cy: y, r: 9 }));
      if (p.n) g.appendChild(el("text", { x, y: y + 3, class: "n" }, p.n.replace(/^0/, "")));
      const right = p.lon < 60;
      const t = el("text", { x: right ? x + 13 : x - 13, y: y + 4, class: "city", "text-anchor": right ? "start" : "end" }, p.city + (p.current ? " (now)" : ""));
      g.appendChild(t);
      s.appendChild(g);
    });
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
      const start = X(e.start), end = X((e.end || 2026.7) + (e.end ? 0.9 : 0));
      const w = Math.max(end - start, 6);
      s.appendChild(el("rect", { x: start, y: y + 6, width: w, height: 16, class: "bar" + (i % 2 ? " alt" : "") }));
      const label = (e.n ? e.n + " " : "") + e.city + " · " + e.role;
      const fits = w > label.length * 7.4;
      s.appendChild(el("text", { x: fits ? start + 6 : (end + 8 > W - 230 ? start - 8 : end + 8), y: y + 18, class: "lbl", "text-anchor": fits ? "start" : (end + 8 > W - 230 ? "end" : "start"), fill: fits ? "var(--paper)" : null }, label));
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
    // orthographic-ish placement: lon/lat to circle using simple equirect inside the circle
    places.filter(p => !p.regional).forEach(p => {
      const x = 200 + (p.lon / 180) * 175, y = 200 - (p.lat / 90) * 150;
      const g = el("g", { class: "mk" + (p.current ? " cur" : "") });
      g.appendChild(el("circle", { cx: x, cy: y, r: 6 }));
      g.appendChild(el("text", { x: x + 10, y: y + 5, class: "city", style: "font-size:13px" }, p.city));
      s.appendChild(g);
    });
    const m = el("text", { x: 22, y: 380, class: "lbl" }, "G · M · D");
    m.setAttribute("style", "font-family: var(--serif); font-size: 22px; fill: var(--ink); letter-spacing: .2em;");
    s.appendChild(m);
    return s;
  }

  window.FIG = { figure, placesMap, careerTimeline, heroPlate };
})();
