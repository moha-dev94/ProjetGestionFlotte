/* =========================================================
   Données : chargées depuis l'API PHP (base SQLite ou MySQL).
   Le serveur envoie des dates "AAAA-MM-JJ" ; l'interface les convertit
   en jours par rapport à aujourd'hui (0 = aujourd'hui, -1 = hier).
   ========================================================= */
let state = { vehicles: [], customers: [], reservations: [] };
let AGENCIES = {};
let session = null;     // { role, customerId, name, email } une fois connecté
let serverError = "";   // message affiché sur la page de connexion si l'API ne répond pas

const ui = {
  view: (location.hash || "").slice(1),
  agency: "all",
  fleet: { status: "all", cat: "all", q: "" },
  planStart: -3,
  authMode: "login",
  search: { agency: "LYO", cat: "all", start: 1, end: 4 },
  docRefuse: null,
  refusingRes: false,
  pendingPhotos: [],
  onConfirm: null,
  busy: false,
  brandDraft: null,   // marque en cours d'édition (écran Personnalisation)
};

/* Appel à l'API. Sans corps : GET ; avec corps : POST en JSON. */
async function api(route, body) {
  const options = { method: body === undefined ? "GET" : "POST", headers: { "X-Requested-With": "fetch" }, credentials: "same-origin" };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_URL}?r=${encodeURI(route)}`, options);
  } catch (e) {
    throw new Error("Le serveur ne répond pas. Lancez-le avec : php -S localhost:8000 api/router.php");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && session) { session = null; render(); }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}
const fileUrl = (id) => `${API_URL}?r=files/${id}`;

function setSession(user) {
  session = user ? { role: user.role, customerId: user.role === "client" ? user.id : null, name: user.name, email: user.email } : null;
}

/* Recharge toutes les données visibles par l'utilisateur connecté. */
async function reload() {
  const s = await api("state");
  setSession(s.user);
  setBrand(s.brand);
  AGENCIES = s.agencies;
  state.vehicles = s.vehicles.map((v) => ({
    ...v,
    ctDays: offOf(v.ctDate),
    photos: v.photos.map((p) => fileUrl(p.fileId)),
    photoIds: v.photos.map((p) => p.id),
  }));
  state.customers = s.customers.map((c) => ({
    ...c,
    since: offOf(c.since),
    permisExpired: !!(c.docs.permis && c.docs.permis.specimenExpired),
    docs: Object.fromEntries(Object.keys(DOC_TYPES).map((type) => {
      const d = c.docs[type] || { status: "manquant" };
      return [type, {
        status: d.status,
        file: d.fileId ? fileUrl(d.fileId) : null,
        specimen: !!d.specimen,
        day: d.sentOn ? offOf(d.sentOn) : null,
        reason: d.reason || "",
        counter: !!d.counter,
      }];
    })),
  }));
  state.reservations = s.reservations.map((r) => ({
    ...r,
    start: offOf(r.start),
    end: offOf(r.end),
    requestedDay: offOf(r.requestedOn),
    photosOut: r.photosOut.map(fileUrl),
    photosIn: r.photosIn.map(fileUrl),
  }));
  if (!AGENCIES[ui.search.agency]) ui.search.agency = Object.keys(AGENCIES)[0];
}

/* Exécute une action côté serveur, recharge les données et met l'écran à jour.
   keepPanel : garde la fenêtre ouverte (ex. : vérification d'un document). */
async function act(route, body = {}, { keepPanel = false, message } = {}) {
  if (ui.busy) return null;
  ui.busy = true;
  try {
    const res = await api(route, body);
    await reload();
    if (keepPanel) refresh(); else { closePanel(); render(); }
    if (message) toast(typeof message === "function" ? message(res) : message);
    return res;
  } catch (e) {
    toast(e.message);
    return null;
  } finally {
    ui.busy = false;
  }
}
