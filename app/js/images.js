/* =========================================================
   Images : illustrations par défaut, spécimens de documents, compression
   ========================================================= */
const SHAPE_OF = { Citadine: "hatch", Compacte: "hatch", "Électrique": "hatch", SUV: "suv", Premium: "sedan", Utilitaire: "van" };
const SHAPES = {
  hatch: { body: "M52 172 L52 128 Q54 112 72 108 L96 82 Q102 76 112 76 L226 76 Q238 76 248 84 L284 110 L338 118 Q356 121 356 138 L356 172 Z", glass: ["M100 84 L168 84 L168 106 L82 106 Z", "M176 84 L230 84 Q238 84 244 90 L266 106 L176 106 Z"], wheels: [112, 296], r: 26, head: [346, 124], tail: [52, 114] },
  suv: { body: "M48 172 L48 112 Q50 96 70 92 L92 62 Q98 56 110 56 L230 56 Q242 56 252 64 L290 96 L338 102 Q358 105 358 124 L358 172 Z", glass: ["M100 64 L168 64 L168 90 L80 90 Z", "M176 64 L234 64 Q242 64 248 70 L270 90 L176 90 Z"], wheels: [112, 296], r: 30, head: [348, 110], tail: [48, 100] },
  sedan: { body: "M44 172 L44 134 Q46 124 62 120 L110 112 L146 86 Q154 80 166 80 L238 80 Q250 80 260 88 L292 112 L340 118 Q358 121 358 140 L358 172 Z", glass: ["M152 88 L196 88 L196 110 L120 110 Z", "M204 88 L238 88 Q246 88 252 94 L272 110 L204 110 Z"], wheels: [110, 300], r: 26, head: [348, 126], tail: [44, 124] },
  van: { body: "M40 172 L40 60 Q40 48 54 48 L270 48 Q284 48 292 58 L322 100 L346 106 Q360 110 360 126 L360 172 Z", glass: ["M276 58 Q282 58 288 66 L312 100 L272 100 L272 58 Z"], wheels: [104, 300], r: 27, head: [350, 114], tail: [40, 70] },
};
const artCache = new Map();
function vehicleArt(v) {
  const key = v.id + v.color;
  if (artCache.has(key)) return artCache.get(key);
  const s = SHAPES[SHAPE_OF[v.cat]];
  const wheels = s.wheels.map((x) => `<circle cx="${x}" cy="172" r="${s.r + 4}" fill="#07070a"/><circle cx="${x}" cy="172" r="${s.r}" fill="#141418"/><circle cx="${x}" cy="172" r="${s.r * 0.55}" fill="#9a9aae"/><circle cx="${x}" cy="172" r="4" fill="#2a2a33"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22122e"/><stop offset="1" stop-color="#0b0b10"/></linearGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".3"/><stop offset=".55" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#sky)"/>
    <circle cx="332" cy="40" r="15" fill="#f4f4f0" opacity=".85"/>
    <path d="M0 150 L70 112 L130 140 L210 98 L290 136 L350 112 L400 130 L400 200 L0 200 Z" fill="#15121f"/>
    <rect y="198" width="400" height="42" fill="#050507"/>
    <path d="M0 220 H400" stroke="#ffd60a" stroke-width="3" stroke-dasharray="26 22" opacity=".7"/>
    <ellipse cx="200" cy="200" rx="170" ry="7" fill="#000000" opacity=".6"/>
    <path d="${s.body}" fill="${v.color}"/>
    <path d="${s.body}" fill="url(#shine)"/>
    <path d="${s.body}" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1.5"/>
    ${s.glass.map((g) => `<path d="${g}" fill="#0e1622" opacity=".92"/>`).join("")}
    <rect x="${s.head[0]}" y="${s.head[1]}" width="10" height="7" rx="2" fill="#ffd60a"/>
    <rect x="${s.tail[0]}" y="${s.tail[1]}" width="6" height="10" rx="1" fill="#e3061b"/>
    ${wheels}
    ${v.cat === "Électrique" ? '<path d="M206 120 l-12 20 h9 l-5 16 l14 -22 h-9 l5 -14 z" fill="#2ee59d"/>' : ""}
  </svg>`;
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  artCache.set(key, url);
  return url;
}
const photoOf = (v) => (v.photos && v.photos[0]) || vehicleArt(v);

function docSpecimen(c, type) {
  const parts = c.name.split(" ");
  const first = parts[0];
  const last = (parts.slice(1).join(" ") || parts[0]).toUpperCase();
  const dmy = { day: "2-digit", month: "2-digit", year: "numeric" };
  const expired = type === "permis" && c.permisExpired;
  const bg = { permis: "#f5d3dd", identite: "#d7e6f4", domicile: "#f7f7f2" }[type];
  const title = { permis: "PERMIS DE CONDUIRE", identite: "CARTE D'IDENTITÉ", domicile: "FACTURE D'ÉNERGIE" }[type];
  const fields = {
    permis: [["1.", last], ["2.", first], ["3.", "14/05/1994"], ["4b.", (expired ? "Expiré le " : "Valable au ") + fmtDate(expired ? -224 : 1460, dmy)], ["9.", "B"]],
    identite: [["Nom", last], ["Prénom", first], ["Né(e) le", "14/05/1994"], ["Expire le", fmtDate(2200, dmy)]],
    domicile: [["Titulaire", c.name], ["Adresse", "12 rue des Lilas, 69003 Lyon"], ["Émise le", fmtDate(-20, dmy)], ["Montant", "86,40 €"]],
  }[type];
  const x = type === "domicile" ? 18 : 110;
  const valueX = x + (type === "permis" ? 30 : 64);
  const rows = fields.map(([k, val], i) => {
    const y = 66 + i * 24;
    const red = expired && k === "4b.";
    return `<text x="${x}" y="${y}" font-size="11" fill="#6a6a78">${esc(k)}</text><text x="${valueX}" y="${y}" font-size="13" font-weight="700" fill="${red ? "#c0001a" : "#15151c"}">${esc(val)}</text>`;
  }).join("");
  const photo = type === "domicile" ? "" : `<rect x="16" y="50" width="80" height="102" rx="4" fill="#c9c9d2"/><circle cx="56" cy="88" r="18" fill="#9a9aa8"/><path d="M26 152 Q56 110 86 152 Z" fill="#9a9aa8"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 214" font-family="Arial, sans-serif">
    <rect width="340" height="214" rx="12" fill="${bg}"/>
    <rect width="340" height="36" rx="12" fill="#000000" fill-opacity=".08"/>
    <text x="16" y="24" font-size="13" font-weight="700" fill="#2a2a33" letter-spacing="1">${title}</text>
    ${photo}${rows}
    <text x="170" y="132" transform="rotate(-16 170 120)" text-anchor="middle" font-size="48" font-weight="900" fill="#e3061b" fill-opacity=".2">SPÉCIMEN</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
const docSrc = (c, type) => { const d = c.docs[type]; return d.file || (d.specimen ? docSpecimen(c, type) : null); };

function compressImage(file, max = 1000, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image illisible")); };
    img.src = url;
  });
}
async function readImages(fileList) {
  const out = [];
  for (const f of fileList) {
    if (!f.type.startsWith("image/")) { toast(`${f.name} n'est pas une image. Envoyez une photo ou un scan en JPG ou PNG.`); continue; }
    try { out.push(await compressImage(f)); } catch (e) { toast(`Impossible de lire ${f.name}. Essayez une autre photo.`); }
  }
  return out;
}
/* Sauvegarde après ajout de photos ; annule l'ajout si le stockage est plein. */
function saveOrUndo(undo) {
  if (save()) return true;
  undo();
  toast("Le stockage de ce navigateur est plein. Supprimez des photos ou réinitialisez la démo.");
  return false;
}

/* =========================================================
   Icônes
   ========================================================= */
const ICONS = {
  tableau: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
  demandes: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 12l2 2 4-4"/>',
  flotte: '<path d="M5 16h14l-1.5-5.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5Z"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>',
  planning: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h5M10 17h6"/>',
  mouvements: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  entretien: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.5-.5-.5-2.5Z"/>',
  clients: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.6a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-4.9"/>',
  "ma-location": '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  reserver: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  "mes-reservations": '<path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 9h6M9 13h6"/>',
  "mes-documents": '<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="9" cy="12" r="2.2"/><path d="M14 11h4M14 14h3"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
