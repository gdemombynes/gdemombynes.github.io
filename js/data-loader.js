// Loads the JSON data files and exposes them as window.SITE.
// The page must be served over HTTP (fetch() does not work from file://).
(function () {
  const files = ["site", "papers", "posts", "figures", "media"];
  window.SITE_READY = Promise.all(
    files.map(f => fetch(`data/${f}.json`, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new Error(`data/${f}.json → ${r.status}`);
      return r.json();
    }))
  ).then(([site, papers, posts, figures, media]) => {
    window.SITE = { site, papers, posts, figures, media };
    return window.SITE;
  });
})();
