/* =========================================================
   Règles métier
   ========================================================= */
const byId = (id) => state.vehicles.find((v) => v.id === id);
const resById = (id) => state.reservations.find((r) => r.id === id);
const custById = (id) => state.customers.find((c) => c.id === id);
const me = () => (session && session.role === "client" ? custById(session.customerId) : null);
const agencyName = (k) => AGENCIES[k].name;
const inAgency = (v) => ui.agency === "all" || v.agency === ui.agency;
const visibleVehicles = () => state.vehicles.filter(inAgency);
const visibleRes = () => state.reservations.filter((r) => inAgency(byId(r.vehicleId)));
const isLate = (r) => r.status === "en_cours" && r.end < 0;
const resKey = (r) => (isLate(r) ? "retard" : r.status);
const effectiveEnd = (r) => (isLate(r) ? 0 : r.end);
const blocking = (r) => r.status === "confirmee" || r.status === "en_cours" || r.status === "demande";

function vehicleStatus(v) {
  if (v.state === "entretien") return "entretien";
  if (v.state === "hs") return "hs";
  const current = currentRes(v);
  if (current) return isLate(current) ? "retard" : "location";
  if (state.reservations.some((r) => r.vehicleId === v.id && r.status === "confirmee" && r.start === 0)) return "reserve";
  return "disponible";
}
const currentRes = (v) => state.reservations.find((r) => r.vehicleId === v.id && r.status === "en_cours");
const nextRes = (v) => state.reservations.filter((r) => r.vehicleId === v.id && r.status === "confirmee").sort((a, b) => a.start - b.start)[0];

/* Deux locations du même véhicule ne partagent jamais un jour :
   le véhicule rendu le soir est préparé avant de repartir. */
function hasConflict(vehicleId, start, end, ignoreId) {
  return state.reservations.some((r) => r.vehicleId === vehicleId && r.id !== ignoreId && blocking(r) && start <= effectiveEnd(r) && r.start <= end);
}
function availableVehicles(agency, cat, start, end) {
  return state.vehicles.filter((v) => v.agency === agency && v.state === "ok" && (cat === "all" || v.cat === cat) && !hasConflict(v.id, start, end));
}

function occupancy(day, vehicles) {
  if (!vehicles.length) return 0;
  const ids = new Set(vehicles.map((v) => v.id));
  const busy = new Set(state.reservations
    .filter((r) => ids.has(r.vehicleId) && ["confirmee", "en_cours", "terminee"].includes(r.status) && r.start <= day && day <= effectiveEnd(r))
    .map((r) => r.vehicleId));
  return Math.round((busy.size / vehicles.length) * 100);
}

function maintenanceInfo(v) {
  const kmLeft = v.nextServiceKm - v.km;
  return {
    kmLeft,
    service: kmLeft <= 0 ? "late" : kmLeft <= 1500 ? "soon" : "ok",
    ct: v.ctDays <= 0 ? "late" : v.ctDays <= 30 ? "soon" : "ok",
  };
}
function alerts(vehicles = visibleVehicles()) {
  const list = [];
  vehicles.forEach((v) => {
    if (v.state === "hs") return;
    const m = maintenanceInfo(v);
    if (m.service !== "ok" && v.state !== "entretien") list.push({ v, kind: "service", sev: m.service, text: m.service === "late" ? `Révision dépassée de ${fmtKm(-m.kmLeft)}` : `Révision dans ${fmtKm(m.kmLeft)}` });
    if (m.ct !== "ok") list.push({ v, kind: "ct", sev: m.ct, text: m.ct === "late" ? "Contrôle technique expiré" : `Contrôle technique dans ${v.ctDays} j` });
  });
  return list.sort((a, b) => (a.sev === "late" ? -1 : 1) - (b.sev === "late" ? -1 : 1));
}

const docsList = (c) => Object.keys(DOC_TYPES).map((k) => ({ type: k, ...c.docs[k] }));
const docsValid = (c) => docsList(c).every((d) => d.status === "valide");
const docsSent = (c) => docsList(c).every((d) => d.status === "valide" || d.status === "en_attente");
const docsToFix = (c) => docsList(c).filter((d) => d.status === "manquant" || d.status === "refuse").length;
const pendingRequests = () => visibleRes().filter((r) => r.status === "demande");
const customersWithPendingDocs = () => state.customers.filter((c) =>
  docsList(c).some((d) => d.status === "en_attente") && !state.reservations.some((r) => r.customerId === c.id && r.status === "demande"));

function computeReturn(r, kmEnd, fuelEnd) {
  const v = byId(r.vehicleId);
  const days = Math.max(1, effectiveEnd(r) - r.start);
  const driven = Math.max(0, kmEnd - r.kmStart);
  const included = days * KM_INCLUDED_PER_DAY;
  const extraKm = Math.max(0, driven - included);
  const missing = Math.max(0, r.fuelStart - fuelEnd);
  const electric = v.cat === "Électrique";
  const energyFee = electric ? missing * CHARGE_PRICE_PER_PCT : (missing / 100) * TANK_LITERS * FUEL_PRICE;
  const lateDays = Math.max(0, -r.end);
  const lateFee = lateDays * v.price * 1.5;
  return { driven, included, extraKm, extraFee: extraKm * EXTRA_KM_PRICE, energyFee, electric, lateDays, lateFee, total: r.price + extraKm * EXTRA_KM_PRICE + energyFee + lateFee };
}
