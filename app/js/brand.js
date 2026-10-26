/* =========================================================
   Marque blanche : nom, sigle ou logo, couleurs, ambiance et polices.
   La marque est enregistrée en base (table settings) et s'applique
   en changeant les variables CSS de base.css.
   ========================================================= */
const BRAND_DEFAULTS = {
  name: "TougeFleet", tagline: "Location de véhicules", mark: "峠",
  accent: "#e3061b", highlight: "#ffd60a", ambiance: "nuit",
  fontDisplay: "Bebas Neue", fontBody: "Barlow", logoFileId: null,
};

/* Chaque ambiance redéfinit les fonds, textes et couleurs de statut. */
const AMBIANCES = {
  nuit: {
    label: "Nuit", scheme: "dark",
    tokens: { bg: "#0b0b10", panel: "#13131b", "panel-2": "#1a1a25", line: "#272736", fg: "#ececf2", muted: "#9a9aae", dim: "#64647c",
      ok: "#2ee59d", res: "#ffd60a", loc: "#4da3ff", maint: "#ff8a3d", hs: "#8a8a9e", late: "#ff3d6e", wait: "#c08bff" },
  },
  asphalte: {
    label: "Asphalte", scheme: "dark",
    tokens: { bg: "#16181b", panel: "#1e2125", "panel-2": "#262a2f", line: "#353a41", fg: "#eef0f2", muted: "#a3aab2", dim: "#6c737b",
      ok: "#34d399", res: "#facc15", loc: "#60a5fa", maint: "#fb923c", hs: "#9ca3af", late: "#fb7185", wait: "#c4b5fd" },
  },
  clair: {
    label: "Clair", scheme: "light",
    tokens: { bg: "#f3f3ef", panel: "#ffffff", "panel-2": "#f0f0eb", line: "#dcdbd3", fg: "#17171d", muted: "#5d5d6c", dim: "#8d8d9a",
      ok: "#0b8a5a", res: "#a87b00", loc: "#1d64c8", maint: "#c25412", hs: "#71717f", late: "#cc1f4a", wait: "#7c4ddb" },
  },
};

/* Paramètres Google Fonts de chaque police proposée. */
const FONTS_DISPLAY = {
  "Bebas Neue": "Bebas+Neue",
  Oswald: "Oswald:wght@600",
  Anton: "Anton",
  Montserrat: "Montserrat:ital,wght@1,800",
  "Playfair Display": "Playfair+Display:ital,wght@1,700",
};
const FONTS_BODY = {
  Barlow: "Barlow:wght@400;500;600;700",
  Inter: "Inter:wght@400;500;600;700",
  Roboto: "Roboto:wght@400;500;700",
  Poppins: "Poppins:wght@400;500;600;700",
  "Source Sans 3": "Source+Sans+3:wght@400;600;700",
};

/* Points de départ rapides pour une démo de prospection. */
const BRAND_PRESETS = {
  touge: { label: "TougeFleet", accent: "#e3061b", highlight: "#ffd60a", ambiance: "nuit", fontDisplay: "Bebas Neue", fontBody: "Barlow" },
  corporate: { label: "Corporate", accent: "#1f5fd1", highlight: "#f5a524", ambiance: "clair", fontDisplay: "Montserrat", fontBody: "Inter" },
  emeraude: { label: "Émeraude", accent: "#0f9d76", highlight: "#e8d36a", ambiance: "asphalte", fontDisplay: "Oswald", fontBody: "Roboto" },
  prestige: { label: "Prestige", accent: "#b08d57", highlight: "#e9dcc3", ambiance: "nuit", fontDisplay: "Playfair Display", fontBody: "Source Sans 3" },
};

let brand = { ...BRAND_DEFAULTS };

function setBrand(b) {
  brand = { ...BRAND_DEFAULTS, ...b };
  applyBrand(ui.brandDraft || brand);
}

/* Marque affichée : le brouillon en cours d'édition, sinon la marque enregistrée. */
function currentBrand() {
  const d = ui.brandDraft;
  if (d) return { ...d, logoSrc: d.logoData || (!d.removeLogo && d.logoFileId ? fileUrl(d.logoFileId) : null) };
  return { ...brand, logoSrc: brand.logoFileId ? fileUrl(brand.logoFileId) : null };
}

/* Assombrit (amount < 0) ou éclaircit (amount > 0) une couleur #rrggbb. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  return "#" + [n >> 16, (n >> 8) & 255, n & 255]
    .map((c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount))
    .map((c) => c.toString(16).padStart(2, "0")).join("");
}

function applyBrand(b) {
  const root = document.documentElement.style;
  const amb = AMBIANCES[b.ambiance] || AMBIANCES.nuit;
  Object.entries(amb.tokens).forEach(([k, value]) => root.setProperty(`--${k}`, value));
  root.setProperty("color-scheme", amb.scheme);
  root.setProperty("--accent", b.accent);
  root.setProperty("--accent-dark", shade(b.accent, -0.38));
  root.setProperty("--headlight", amb.scheme === "light" ? shade(b.highlight, -0.35) : b.highlight);
  root.setProperty("--f-display", `"${b.fontDisplay}", "Arial Narrow", sans-serif`);
  root.setProperty("--f-ui", `"${b.fontBody}", "Segoe UI", system-ui, sans-serif`);
  loadBrandFonts(b);
  document.title = `${b.name} · Console`;
}

function loadBrandFonts(b) {
  const families = [FONTS_DISPLAY[b.fontDisplay], FONTS_BODY[b.fontBody]].filter(Boolean).map((f) => "family=" + f).join("&");
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  let link = document.getElementById("brand-fonts");
  if (!link) {
    link = document.createElement("link");
    link.id = "brand-fonts";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
}

/* Nom en deux temps : « TougeFleet » → Touge + <em>Fleet</em>, « Auto Loc Pro » → Auto Loc + <em>Pro</em>. */
function brandNameHtml(b = currentBrand()) {
  const name = (b.name || "").trim();
  const space = name.lastIndexOf(" ");
  if (space > 0) return `${esc(name.slice(0, space))} <em>${esc(name.slice(space + 1))}</em>`;
  const camel = name.match(/^(.+?[a-zà-ÿ0-9])([A-ZÀ-Ý].*)$/);
  return camel ? `${esc(camel[1])}<em>${esc(camel[2])}</em>` : esc(name);
}

function brandMarkHtml(b = currentBrand()) {
  if (b.logoSrc) return `<img class="brand__logo" src="${b.logoSrc}" alt="${esc(b.name)}">`;
  const mark = b.mark || initials(b.name || "?");
  return `<span class="brand__kanji${mark.length > 1 ? " brand__kanji--text" : ""}" aria-hidden="true">${esc(mark)}</span>`;
}
