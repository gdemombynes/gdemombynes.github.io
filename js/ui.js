// Theme toggle, scroll-spy, reveal-on-scroll, and the mobile nav.
(function () {
  const root = document.documentElement;
  const KEY = "gd-theme";

  function currentTheme() {
    const t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    document.querySelectorAll(".theme-btn").forEach(b => {
      b.textContent = t === "dark" ? "Light" : "Dark";
      b.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    });
  }
  window.initUI = function () {
    document.querySelectorAll(".theme-btn").forEach(b => {
      b.addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
    });
    setTheme(currentTheme());

    // Scroll-spy for nav and rail.
    const links = Array.from(document.querySelectorAll('.nav a[href^="#"], .rail a[href^="#"]'));
    const targets = Array.from(new Set(links.map(a => a.getAttribute("href").slice(1))))
      .map(id => document.getElementById(id)).filter(Boolean);
    let active = null;
    function mark(id) {
      if (id === active) return;
      active = id;
      links.forEach(a => {
        const on = a.getAttribute("href") === "#" + id;
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }
    function spy() {
      const y = window.scrollY + 90;
      let cur = targets[0];
      for (const t of targets) { if (t.offsetTop <= y) cur = t; }
      if (cur) mark(cur.id);
    }
    window.addEventListener("scroll", spy, { passive: true });
    spy();

    // Reveal on scroll (disabled for reduced motion by CSS).
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      document.querySelectorAll(".reveal").forEach(el => io.observe(el));
    } else {
      document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
    }

    // Close the mobile menu after choosing a link.
    document.querySelectorAll(".nav-details .nav a").forEach(a => {
      a.addEventListener("click", () => { a.closest("details").removeAttribute("open"); });
    });
  };
})();
