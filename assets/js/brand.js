/* =========================================================
   Marque blanche de la vitrine : reprend le nom, le sigle ou le logo,
   les couleurs et la police des titres réglés dans l'application
   (écran Personnalisation). Sans serveur PHP, la vitrine reste en TougeFleet.
   ========================================================= */
(function () {
  const API = "api/index.php";
  const DEFAULT_NAME = "TougeFleet";
  const FONTS_DISPLAY = {
    "Bebas Neue": "Bebas+Neue",
    Oswald: "Oswald:wght@600",
    Anton: "Anton",
    Montserrat: "Montserrat:ital,wght@1,800",
    "Playfair Display": "Playfair+Display:ital,wght@1,700",
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // « TougeFleet » → Touge<em>Fleet</em>, « Auto Loc Pro » → Auto Loc <em>Pro</em>
  function nameHtml(name) {
    const space = name.lastIndexOf(" ");
    if (space > 0) return `${esc(name.slice(0, space))} <em>${esc(name.slice(space + 1))}</em>`;
    const camel = name.match(/^(.+?[a-zà-ÿ0-9])([A-ZÀ-Ý].*)$/);
    return camel ? `${esc(camel[1])}<em>${esc(camel[2])}</em>` : esc(name);
  }
  const plainName = (name) => name.replace(/([a-zà-ÿ0-9])([A-ZÀ-Ý])/g, "$1 $2");
  const slug = (name) => name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "");
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    return "#" + [n >> 16, (n >> 8) & 255, n & 255]
      .map((c) => Math.round(c * (1 + amount)).toString(16).padStart(2, "0")).join("");
  }

  function apply(b) {
    if (b.name === DEFAULT_NAME && !b.logoFileId && b.accent === "#e3061b") return;

    document.querySelectorAll("[data-brand-name]").forEach((el) => { el.innerHTML = nameHtml(b.name); });
    document.querySelectorAll("[data-brand-plain]").forEach((el) => { el.textContent = plainName(b.name); });
    document.querySelectorAll("[data-brand-url]").forEach((el) => { el.textContent = `app.${slug(b.name)}.fr/flotte`; });
    document.querySelectorAll("[data-brand-mark]").forEach((el) => {
      if (b.logoFileId) {
        el.innerHTML = `<img src="${API}?r=files/${b.logoFileId}" alt="" style="width:100%;height:100%;object-fit:contain;transform:skewX(8deg)">`;
        el.style.background = "transparent";
      } else {
        el.textContent = b.mark || b.name.slice(0, 2).toUpperCase();
        if ((b.mark || "").length > 1) el.style.fontSize = "1rem";
      }
    });
    if (b.name !== DEFAULT_NAME) {
      document.querySelectorAll("[data-brand-jp]").forEach((el) => el.remove());
      document.title = document.title.replace("Touge Fleet", plainName(b.name));
    }

    const root = document.documentElement.style;
    root.setProperty("--c-red", b.accent);
    root.setProperty("--c-red-dark", shade(b.accent, -0.38));
    root.setProperty("--c-yellow", b.highlight);
    if (FONTS_DISPLAY[b.fontDisplay]) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${FONTS_DISPLAY[b.fontDisplay]}&display=swap`;
      document.head.appendChild(link);
      root.setProperty("--f-display", `"${b.fontDisplay}", "Arial Narrow", sans-serif`);
    }
  }

  fetch(`${API}?r=brand`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => { if (data && data.brand) apply(data.brand); })
    .catch(() => { /* pas de serveur PHP : on garde la marque par défaut */ });
})();
