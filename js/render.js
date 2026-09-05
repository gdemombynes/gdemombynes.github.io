// Renders every section from window.SITE.
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const h = (tag, attrs, children) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] == null) continue;
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (children != null && !Array.isArray(children)) children = [children];
    (children || []).forEach(c => { if (c == null) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  };
  const ext = { target: "_blank", rel: "noopener" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!m) return String(y);
    return `${d ? d + " " : ""}${MONTHS[m - 1]} ${y}`;
  }
  const TYPE_LABEL = { journal: "Journal article", wps: "Working paper", book: "Book", report: "Report", chapter: "Book chapter", comment: "Comment / letter" };
  const COUNTRY_LABEL = { colombia: "Colombia", philippines: "Philippines", vietnam: "Vietnam", kenya: "Kenya & East Africa", latam: "Latin America & Caribbean" };
  const TOPIC_LABEL = { ai: "AI", jobs: "Jobs", digital: "Digital", covid: "COVID-19", health: "Health", education: "Education", diagnostic: "Country diagnostics", nutrition: "Nutrition", skills: "Skills", migration: "Migration", services: "Public services", data: "Data & surveys", finance: "Mobile money", evaluation: "Impact evaluation", poverty: "Poverty", crime: "Crime & violence", inequality: "Inequality" };
  const coord = (lat, lon) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
  const VENUE_SHORT = [[/lancet/i, "Lancet"], [/bmj/i, "BMJ Open"], [/clinical nutrition/i, "AJCN"], [/world economics/i, "World Economics"], [/human biology/i, "EHB"], [/rivista/i, "Rivista"], [/african economies/i, "JAE"], [/development economics/i, "JDE"], [/development effectiveness/i, "JDE"], [/infectious/i, "IJID"], [/canadian/i, "CJDS"], [/oxford university press/i, "OUP"], [/world bank/i, "World Bank"]];
  const initials = t => { for (const [re, lab] of VENUE_SHORT) if (re.test(t)) return lab; return t.split(/\s+/).filter(w => /^[A-Z]/.test(w)).slice(0, 3).map(w => w[0]).join(""); };

  function coverEl(p, size) {
    if (p.cover) {
      return h("img", { class: "cover", src: p.cover, alt: "Cover of " + p.title, loading: "lazy", width: size || 120, height: Math.round((size || 120) * 1.5) });
    }
    return h("div", { class: "cover-card " + (p.type || ""), "aria-hidden": "true" }, [
      h("span", { class: "bar" }),
      h("div", { class: "ini", text: initials(p.venue || p.title) || "GD" }),
      h("div", { class: "ct", text: p.title }),
      h("div", { class: "cy", text: String(p.year) })
    ]);
  }
  function paperLinks(p) {
    const links = [];
    if (p.url) links.push(h("a", Object.assign({ href: p.url }, ext), "Read"));
    (p.links || []).forEach(l => links.push(h("a", Object.assign({ href: l.url }, ext), l.label)));
    return h("div", { class: "pl" }, links);
  }
  function shelf(papers) {
    return h("div", { class: "shelf" }, papers.map(p => h("div", { class: "item" }, [
      h("a", Object.assign({ href: p.url || "#papers", "aria-label": p.title }, p.url ? ext : {}), [coverEl(p, 150)]),
      h("a", Object.assign({ class: "t", href: p.url || "#papers" }, p.url ? ext : {}), p.title),
      h("div", { class: "m", text: `${p.year} · ${p.venue.split(",")[0]}` })
    ])));
  }
  function postList(posts, showOutlet) {
    return h("ul", { class: "posts" }, posts.map(x => h("li", {}, [
      h("span", { class: "d", text: fmtDate(x.date) }),
      h("span", {}, [
        h("a", Object.assign({ href: x.url }, ext), x.title),
        showOutlet ? h("span", { class: "o", text: x.outlet + (x.coauthors && x.coauthors.length ? " · with " + x.coauthors.join(", ") : "") }) : null
      ])
    ])));
  }
  const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "");
  const byYearDesc = (a, b) => b.year - a.year || a.title.localeCompare(b.title);

  // ---------- Hero
  function renderHero(S) {
    const s = S.site;
    const root = $("#about");
    const nameParts = s.name.split(" ");
    root.appendChild(h("div", { class: "hero-grid" }, [
      h("div", {}, [
        h("div", { class: "kicker", text: s.tagline }),
        h("h1", {}, nameParts.length > 2 ? [nameParts[0] + " ", h("span", { class: "mid", text: nameParts[1] + " " }), nameParts.slice(2).join(" ")] : [nameParts[0], h("br"), nameParts.slice(1).join(" ")]),
        h("p", { class: "role", text: s.headline }),
        h("p", { class: "profile", text: s.profile }),
        h("div", { class: "bio" }, s.bio.map(t => h("p", { text: t }))),
        h("dl", { class: "facts" }, [
          h("dt", { text: "Education" }), h("dd", {}, s.education.map((e, i) => h("div", { text: `${e.degree}, ${e.inst}, ${e.year}` }))),
          h("dt", { text: "Languages" }), h("dd", { text: s.languages.join(", ") }),
          h("dt", { text: "Citizenship" }), h("dd", { text: s.citizenship.join(" and ") })
        ]),
        h("div", { class: "metrics" }, [
          `${s.metrics.citations.toLocaleString()}+ citations · h-index ${s.metrics.h_index} · `,
          h("a", Object.assign({ href: s.links.scholar }, ext), "Google Scholar"),
          ` · as of ${s.metrics.as_of}`
        ]),
        h("div", { class: "links-row" }, [
          h("a", Object.assign({ href: s.links.worldbank }, ext), "World Bank profile"),
          h("a", Object.assign({ href: s.links.linkedin }, ext), "LinkedIn"),
          h("a", Object.assign({ href: s.links.ideas }, ext), "IDEAS/RePEc"),
          h("a", Object.assign({ href: s.links.github }, ext), "GitHub")
        ])
      ]),
      h("figure", { class: "plate" }, [
        s.photo ? h("img", { src: s.photo, alt: s.name, width: 480, height: 600 }) : FIG.heroPlate(s.places),
        h("figcaption", { text: s.photo ? s.name : "Bogotá · Manila · Hanoi · Nairobi · Washington" })
      ])
    ]));
    // Experience
    const tl = h("div", { class: "timeline reveal" });
    tl.appendChild(h("div", { class: "sub-h", text: "Experience" }));
    const exp = s.experience.slice().sort((a, b) => b.start - a.start);
    const placesByKey = Object.fromEntries(s.places.map(p => [p.id, p]));
    const rows = exp.filter(e => e.start >= 2003).map(e => Object.assign({}, e, { n: e.place && placesByKey[e.place] ? placesByKey[e.place].n : "" }));
    tl.appendChild(h("div", { class: "tl-svg-wrap" }, [FIG.careerTimeline(rows)]));
    tl.appendChild(h("ul", { class: "exp-list" }, exp.map(e => h("li", {}, [
      h("details", {}, [
        h("summary", {}, [
          h("span", { class: "yrs", text: `${e.start}–${e.end == null ? "" : (e.end === e.start ? "" : String(e.end).slice(2))}`.replace(/–$/, e.end == null ? "–" : "") }),
          h("span", { class: "r" }, [e.role, h("span", { class: "o", text: `${e.org} · ${e.city}` })])
        ]),
        h("ul", {}, e.bullets.map(b => h("li", { text: b })))
      ])
    ]))));
    root.appendChild(tl);
  }

  // ---------- Now: AI and human capital
  function renderAI(S) {
    const root = $("#ai"), s = S.site;
    const feat = S.posts.find(p => p.featured && p.image);
    if (feat) {
      root.appendChild(h("article", { class: "feature reveal" }, [
        h("div", { class: "fimg" }, [h("img", { class: "feature-img", src: feat.image, alt: "Illustration from the China Daily op-ed", loading: "lazy", width: 723, height: 779 })]),
        h("div", { class: "fbody" }, [
          h("div", { class: "fk", text: "Op-ed · " + feat.outlet }),
          h("blockquote", { text: "AI augments human capital, and in a variety of tasks, it has proved to be an equalizing force." }),
          h("div", { class: "fmeta", text: `${feat.outlet} · Opinion · ${fmtDate(feat.date)}` }),
          h("p", { class: "fp", text: feat.blurb }),
          h("a", Object.assign({ class: "cta", href: feat.url }, ext), "Read the op-ed ↗")
        ])
      ]));
    }
    root.appendChild(h("p", { class: "lead", text: "Since 2023 Gabriel's research and leadership have centered on a single question: what will artificial intelligence mean for people in low- and middle-income countries, for how they learn, stay healthy, and earn a living? The answer so far is more measured than either the boosters or the doomsayers suggest. Exposure to AI rises with education and income, so the first wave of disruption will land in richer countries; in poorer ones, electricity and connectivity remain the binding constraints, while the evidence on AI in classrooms is a warning that tools which substitute for effort can undermine learning." }));
    const featured = S.papers.find(p => p.id === "ai-exposure-2025");
    root.appendChild(FIG.figure("ai-exposure", S.figures, 1));
    if (featured) root.appendChild(h("div", { class: "feat-card reveal" }, [
      coverEl(featured, 96),
      h("div", {}, [
        h("a", Object.assign({ class: "ft", href: featured.url }, ext), featured.title),
        h("div", { class: "fm", text: `${featured.venue} · ${featured.year} · with ${featured.coauthors.join(", ")}` }),
        h("p", { text: featured.blurb })
      ])
    ]));
    const p2 = S.papers.find(p => p.id === "promise-productivity-2025");
    if (p2) root.appendChild(h("div", { class: "feat-card reveal" }, [
      coverEl(p2, 96),
      h("div", {}, [
        h("a", Object.assign({ class: "ft", href: p2.url }, ext), p2.title),
        h("div", { class: "fm", text: `${p2.venue} · ${p2.year}` }),
        h("p", { text: p2.blurb })
      ])
    ]));
    root.appendChild(h("div", { class: "sub-h", text: "Writing on AI and human capital" }));
    root.appendChild(postList(S.posts.filter(p => p.collections.includes("ai") && !p.featured).sort(byDateDesc), true));
    root.appendChild(h("a", Object.assign({ class: "card-link reveal", href: s.links.bulletin }, ext), [
      h("span", { class: "big", text: "30" }),
      h("span", {}, [h("div", { class: "ct", text: "AI & Human Capital Bits" }), h("div", { class: "cs", text: "The complete archive of the biweekly bulletin for World Bank staff, searchable · gdemombynes.github.io/ai-human-capital-bits" })])
    ]));
    root.appendChild(h("div", { class: "two-col" }, [
      h("div", {}, [
        h("div", { class: "sub-h", text: "Leading digital and AI at the Human Capital Project" }),
        h("p", { class: "muted sans", style: "font-size:.88rem", text: s.current_role.scope }),
        h("ul", { class: "dated" }, s.leadership.map(l => h("li", {}, [h("span", { class: "y", text: l.year }), h("span", { text: l.text })])))
      ]),
      h("div", {}, [
        h("div", { class: "sub-h", text: "Podcasts and media" }),
        mediaList(S.media.filter(m => m.kind === "podcast" || m.kind === "interview")),
        h("div", { class: "sub-h", text: "Speaking and affiliations" }),
        h("ul", { class: "dated" }, s.speaking.map(l => h("li", {}, [h("span", { class: "y", text: l.year }), l.url ? h("a", Object.assign({ href: l.url }, ext), l.text) : h("span", { text: l.text })])))
      ])
    ]));
  }
  function mediaList(items) {
    const mic = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="5.5" y="1.5" width="5" height="8" rx="2.5"/><path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2M5.5 14.5h5"/></svg>';
    return h("ul", { class: "media" }, items.map(m => h("li", {}, [
      h("span", { class: "glyph", html: mic }),
      h("div", {}, [
        m.url ? h("a", Object.assign({ class: "t", href: m.url }, ext), m.title) : h("span", { class: "t", text: m.title }),
        h("div", { class: "mm", text: [m.outlet, fmtDate(m.date), m.duration].filter(Boolean).join(" · ") }),
        m.blurb ? h("div", { class: "b", text: m.blurb }) : null,
        m.links && m.links.length > 1 ? h("div", { class: "ll" }, m.links.map(l => h("a", Object.assign({ href: l.url }, ext), l.label))) : null
      ])
    ])));
  }

  function highlightCard(x) {
    return h("article", { class: "highlight reveal" }, [
      h("div", { class: "hk", text: x.kicker }),
      h("h3", { text: x.title }),
      h("div", { class: "hgrid" }, [
        h("div", { class: "htext" }, x.text.map(t => h("p", { text: t }))),
        h("div", { class: "hstats" }, x.stats.map(s => h("div", { class: "stat" }, [h("div", { class: "n", text: s.n }), h("div", { class: "l", text: s.l })])))
      ]),
      h("div", { class: "hlinks" }, x.links.map(l => h("a", Object.assign({ href: l.url }, ext), l.label + " ↗"))),
      x.source ? h("div", { class: "hsrc", text: x.source }) : null
    ]);
  }

  // ---------- Places
  async function renderPlaces(S) {
    const root = $("#places");
    const wrap = h("div", { class: "map-wrap reveal" });
    root.appendChild(wrap);
    wrap.appendChild(await FIG.placesMap(S.site.places));
    const nav = S.site.places.filter(p => p.nav !== false);
    root.appendChild(h("ul", { class: "place-index" }, nav.map(p => h("li", {}, [h("a", { href: "#" + p.id }, [h("span", { class: "n", text: p.n }), p.label])]))));
    const host = $("#country-sections");
    let figN = 2;
    nav.forEach(p => {
      const papers = S.papers.filter(x => x.countries.includes(p.id)).sort(byYearDesc);
      const posts = S.posts.filter(x => x.countries.includes(p.id) && !x.collections.includes("mvp")).sort(byDateDesc);
      const sec = h("section", { class: "sec country", id: p.id, "aria-labelledby": p.id + "-h" });
      sec.appendChild(h("div", { class: "runhead" }, [
        h("span", { class: "num", text: "§ 2." + p.n.replace(/^0/, "") }),
        h("span", { text: p.label }),
        h("span", { class: "coord", text: p.regional ? "Regional" : coord(p.lat, p.lon) }),
        h("span", { text: p.years })
      ]));
      sec.appendChild(h("h2", { id: p.id + "-h", class: "sec-h2", text: p.city ? `${p.label} · ${p.city}` : p.label }));
      sec.appendChild(h("div", { class: "role-line", text: p.role }));
      sec.appendChild(h("p", { class: "lead", text: p.blurb }));
      if (p.highlight) sec.appendChild(highlightCard(p.highlight));
      if (p.figure && S.figures[p.figure]) sec.appendChild(FIG.figure(p.figure, S.figures, figN++));
      if (papers.length) {
        sec.appendChild(h("div", { class: "sub-h", text: "Publications" }));
        sec.appendChild(shelf(papers.filter(x => x.featured).concat(papers.filter(x => !x.featured)).slice(0, 12)));
        if (papers.length > 12) {
          const a = h("a", { href: "#papers", text: `All ${papers.length} publications in the list below` });
          a.addEventListener("click", () => { if (window.filterPapers) window.filterPapers({ country: p.id }); });
          sec.appendChild(h("p", { class: "sans muted", style: "font-size:.82rem" }, [a]));
        }
      }
      if (posts.length) { sec.appendChild(h("div", { class: "sub-h", text: "Writing" })); const pl = postList(posts, true); pl.classList.add("cols"); sec.appendChild(pl); }
      host.appendChild(sec);
    });
    return figN;
  }

  // ---------- MVP
  function renderMVP(S, figN) {
    const root = $("#mvp");
    const m = S.site.mvp;
    const papers = S.papers.filter(p => p.collections.includes("mvp")).sort(byYearDesc);
    const posts = S.posts.filter(p => p.collections.includes("mvp")).sort((a, b) => a.date.localeCompare(b.date));
    root.appendChild(h("p", { class: "lead", text: m.intro }));
    root.appendChild(FIG.figure("mvp-u5mr", S.figures, figN));
    root.appendChild(h("div", { class: "mvp-grid" }, [
      h("div", {}, [
        h("div", { class: "sub-h", text: "How the debate unfolded" }),
        h("ol", { class: "tl" }, m.timeline.map(t => h("li", {}, [h("span", { class: "d", text: t.date }), t.url ? h("a", Object.assign({ href: t.url }, ext), t.text) : h("span", { text: t.text })])))
      ]),
      h("div", {}, [
        h("div", { class: "sub-h", text: "Papers" }),
        shelf(papers)
      ])
    ]));
    root.appendChild(h("div", { class: "sub-h", text: "Blog posts and commentary, in order" }));
    root.appendChild(postList(posts, true));
  }

  // ---------- Papers list with filters
  function renderPapers(S) {
    const root = $("#papers");
    const all = S.papers.slice().sort(byYearDesc);
    const state = { type: "all", country: "all", topic: "all" };
    const list = h("ul", { class: "plist" });
    const count = h("span", { class: "count" });
    const typeBtns = [["all", "All"], ["journal", "Journal articles"], ["wps", "Working papers"], ["book", "Books & reports"]].map(([v, l]) =>
      h("button", { type: "button", "aria-pressed": v === "all" ? "true" : "false", "data-v": v, text: l }));
    const sel = (name, opts) => {
      const s = h("select", { "aria-label": "Filter by " + name });
      s.appendChild(h("option", { value: "all", text: "All " + name }));
      opts.forEach(([v, l]) => s.appendChild(h("option", { value: v, text: l })));
      return s;
    };
    const countries = Object.entries(COUNTRY_LABEL);
    const topics = Array.from(new Set(all.flatMap(p => p.topics))).map(t => [t, TOPIC_LABEL[t] || t]).sort((a, b) => a[1].localeCompare(b[1]));
    const cSel = sel("places", countries), tSel = sel("topics", topics);
    function matches(p) {
      const typeOk = state.type === "all" || (state.type === "book" ? ["book", "report", "chapter"].includes(p.type) : state.type === "journal" ? ["journal", "comment"].includes(p.type) : p.type === state.type);
      return typeOk && (state.country === "all" || p.countries.includes(state.country)) && (state.topic === "all" || p.topics.includes(state.topic));
    }
    function draw() {
      list.innerHTML = "";
      const shown = all.filter(matches);
      const groups = [["Peer-reviewed research", shown.filter(p => ["journal", "comment", "chapter"].includes(p.type))], ["World Bank studies and working papers", shown.filter(p => !["journal", "comment", "chapter"].includes(p.type))]];
      groups.forEach(([label, items]) => {
        if (!items.length) return;
        list.appendChild(h("li", { class: "sub-h", style: "grid-template-columns:1fr;display:block;border:0;padding-top:20px", text: label }));
        items.forEach(p => list.appendChild(h("li", {}, [
          coverEl(p, 72),
          h("div", {}, [
            p.url ? h("a", Object.assign({ class: "pt", href: p.url }, ext), p.title) : h("span", { class: "pt", text: p.title }),
            p.collections.includes("mvp") ? h("span", { class: "tag", text: "MVP" }) : null,
            h("div", { class: "pv" }, [h("span", { class: "y", text: p.year }), `${TYPE_LABEL[p.type] || p.type} · ${p.venue}${p.series && p.series.length ? " · " + p.series.join(" · ") : ""}`]),
            p.coauthors && p.coauthors.length ? h("div", { class: "pc", text: "with " + p.coauthors.join(", ") }) : null,
            p.blurb ? h("p", { class: "pb", text: p.blurb }) : null,
            paperLinks(p)
          ])
        ])));
      });
      count.textContent = `${shown.length} of ${all.length}`;
    }
    typeBtns.forEach(b => b.addEventListener("click", () => { typeBtns.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); state.type = b.dataset.v; draw(); }));
    cSel.addEventListener("change", () => { state.country = cSel.value; draw(); });
    tSel.addEventListener("change", () => { state.topic = tSel.value; draw(); });
    window.filterPapers = opts => { if (opts.country) { cSel.value = opts.country; state.country = opts.country; } draw(); };
    root.appendChild(h("div", { class: "filters", role: "group", "aria-label": "Filter publications" }, [...typeBtns, cSel, tSel, count]));
    root.appendChild(list);
    draw();
  }

  // ---------- Writing
  function renderWriting(S) {
    const root = $("#writing");
    const press = S.posts.filter(p => p.kind === "press").sort(byDateDesc);
    const groups = [];
    groups.push(["Press and op-eds", press]);
    const outlets = ["Protect and Invest in People", "Let's Talk Development", "Development Impact", "Africa Can End Poverty", "East Asia & Pacific on the Rise", "Education for Global Development", "Latin America & Caribbean"];
    outlets.forEach(o => { const items = S.posts.filter(p => p.outlet === o).sort(byDateDesc); if (items.length) groups.push([o + " (World Bank)", items]); });
    root.appendChild(h("p", { class: "lead", text: `${S.posts.length} posts and articles since 2010, on the World Bank's blogs and elsewhere.` }));
    groups.forEach(([label, items]) => {
      root.appendChild(h("div", { class: "writing-group" }, [h("h3", { text: label }), postList(items, false)]));
    });
    root.appendChild(h("div", { class: "writing-group" }, [h("h3", { text: "Podcasts and events" }), mediaList(S.media)]));
  }

  function renderFooter(S) {
    const s = S.site, root = $("#foot");
    root.appendChild(h("div", { class: "frow" }, [
      h("a", Object.assign({ href: s.links.worldbank }, ext), "World Bank"), h("a", Object.assign({ href: s.links.wbblogs }, ext), "World Bank Blogs"),
      h("a", Object.assign({ href: s.links.scholar }, ext), "Google Scholar"), h("a", Object.assign({ href: s.links.ideas }, ext), "IDEAS/RePEc"),
      h("a", Object.assign({ href: s.links.linkedin }, ext), "LinkedIn"), h("a", Object.assign({ href: s.links.github }, ext), "GitHub"), h("a", Object.assign({ href: s.links.bulletin }, ext), "AI & Human Capital Bits")
    ]));
    root.appendChild(h("div", { text: `${s.name} · ${s.languages.join(", ")} · Citizen of the ${s.citizenship.join(" and ")}. Views expressed here are his own.` }));
    root.appendChild(h("div", { class: "colophon", text: `Last updated ${fmtDate(s.updated)} · Set in Newsreader and IBM Plex · No tracking · Source on GitHub` }));
  }

  window.renderAll = async function (S) {
    renderHero(S);
    renderAI(S);
    const figN = await renderPlaces(S);
    renderMVP(S, figN);
    renderPapers(S);
    renderWriting(S);
    renderFooter(S);
  };
})();
