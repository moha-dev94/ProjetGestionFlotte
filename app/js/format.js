/* =========================================================
   Formatage
   ========================================================= */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = new Intl.NumberFormat("fr-FR");
const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const fmtKm = (km) => nf.format(Math.round(km)) + " km";
const dateOf = (off) => { const d = new Date(TODAY); d.setDate(d.getDate() + off); return d; };
const fmtDate = (off, opts = { weekday: "short", day: "numeric", month: "short" }) => dateOf(off).toLocaleDateString("fr-FR", opts);
const fmtShort = (off) => fmtDate(off, { day: "numeric", month: "short" });
function fmtRel(off) {
  if (off === 0) return "aujourd'hui";
  if (off === 1) return "demain";
  if (off === -1) return "hier";
  return "le " + fmtDate(off);
}
const atTime = (off, hhmm) => { const d = dateOf(off); const [h, m] = hhmm.split(":").map(Number); d.setHours(h, m, 0, 0); return d.getTime(); };
const isoOf = (off) => { const d = dateOf(off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const offOf = (iso) => Math.round((new Date(iso + "T00:00:00") - TODAY) / 864e5);
const nights = (r) => Math.max(1, r.end - r.start);
const initials = (name) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const plate = (p, lg) => `<span class="plate${lg ? " plate--lg" : ""}"><span class="plate__eu">F</span><span class="plate__txt">${esc(p)}</span></span>`;
const pill = (key, label) => `<span class="pill pill--${key}">${esc(label)}</span>`;
const vPill = (v) => { const s = vehicleStatus(v); return pill(s, VEHICLE_STATUS[s]); };
const rPill = (r) => pill(resKey(r), RES_STATUS[resKey(r)]);
const dPill = (d) => pill(d.status, DOC_STATUS[d.status]);
const fuelLabel = (v) => (v.cat === "Électrique" ? "Batterie" : "Carburant");
const miniDocs = (c) => `<span class="mini-docs">${docsList(c).map((d) => `<span class="mini-doc mini-doc--${d.status}" title="${DOC_TYPES[d.type].label} : ${DOC_STATUS[d.status]}">${DOC_TYPES[d.type].short}</span>`).join("")}</span>`;
