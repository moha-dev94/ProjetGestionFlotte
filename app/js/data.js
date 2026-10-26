/* =========================================================
   Données d'exemple
   ========================================================= */
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const makeDocs = (status, day) => Object.fromEntries(Object.keys(DOC_TYPES).map((k) =>
  [k, { status, file: null, specimen: status !== "manquant", day, reason: "" }]));

function seed() {
  const V = (id, plate, model, cat, agency, km, fuel, price, nextServiceKm, ctDays, color, extra = {}) =>
    ({ id, plate, model, cat, agency, km, fuel, price, nextServiceKm, ctDays, color, photos: [], state: "ok", note: "", ...extra });

  const vehicles = [
    V("v1", "AE-086-TF", "Toyota Corolla Hybrid", "Compacte", "LYO", 42180, 80, 49, 45000, 120, "#f1f1ec"),
    V("v2", "FD-317-RX", "Mazda MX-5", "Premium", "MRS", 18920, 100, 89, 30000, 300, "#c8102e"),
    V("v3", "GT-200-SC", "Renault Clio", "Citadine", "LYO", 67450, 40, 35, 67000, 12, "#f2a900", { state: "entretien", note: "Révision des 67 000 km et plaquettes avant" }),
    V("v4", "EV-034-NS", "Peugeot e-208", "Électrique", "PAR", 9310, 90, 45, 30000, 400, "#3a7bd5"),
    V("v5", "HB-512-KL", "Peugeot 3008", "SUV", "PAR", 35400, 70, 69, 45000, 200, "#6b6f7a"),
    V("v6", "DZ-778-PM", "Dacia Duster", "SUV", "MRS", 51200, 55, 52, 60000, 21, "#7f8f52"),
    V("v7", "TR-449-UV", "Renault Trafic", "Utilitaire", "PAR", 88300, 65, 75, 89000, 180, "#e4e4e4"),
    V("v8", "GL-903-WX", "Volkswagen Golf", "Compacte", "PAR", 27750, 85, 52, 30000, 260, "#2a4a78"),
    V("v9", "MZ-221-BC", "Tesla Model 3", "Électrique", "PAR", 14400, 75, 95, 30000, 500, "#d6d6dc"),
    V("v10", "YR-660-DF", "Toyota Yaris Hybrid", "Citadine", "LYO", 22100, 95, 39, 30000, 330, "#c0392b"),
    V("v11", "CA-145-GH", "Mercedes Classe A", "Premium", "LYO", 31800, 60, 85, 45000, 150, "#34343c"),
    V("v12", "FI-500-JK", "Fiat 500", "Citadine", "MRS", 40500, 20, 32, 45000, 90, "#9fd3c7"),
    V("v13", "KG-318-LN", "Kia Niro EV", "Électrique", "MRS", 12900, 88, 59, 30000, 410, "#4f6d7a"),
    V("v14", "MT-702-QR", "Renault Master", "Utilitaire", "LYO", 104200, 50, 89, 105000, 60, "#efefef", { state: "hs", note: "Sinistre carrosserie, expertise en attente" }),
    V("v15", "SK-834-ST", "Skoda Octavia Break", "Compacte", "MRS", 58000, 70, 55, 60000, 210, "#6a4f3f"),
    V("v16", "CP-219-YZ", "Citroën C3", "Citadine", "PAR", 46300, 45, 34, 60000, 140, "#e67e22"),
  ];

  const customers = [];
  const cust = (name, extra = {}) => {
    let c = customers.find((x) => x.name === name);
    if (!c) {
      c = { id: "c" + (customers.length + 1), name, email: slug(name) + "@exemple.fr", since: -200, docs: makeDocs("valide", -120), ...extra };
      customers.push(c);
    }
    return c;
  };
  // Comptes particuliers utiles pour la démo
  cust("Paul Henry", { since: -420 });
  cust("Inès Haddad", { since: -2, docs: makeDocs("en_attente", -1), permisExpired: true });
  cust("Yanis Benali", { since: -3, docs: makeDocs("en_attente", -1) });
  const mehdi = cust("Mehdi Karim", { since: -5, docs: makeDocs("en_attente", -4) });
  mehdi.docs.identite = { status: "refuse", file: null, specimen: true, day: -4, reason: "Document illisible ou flou" };
  mehdi.docs.domicile = { status: "manquant", file: null, specimen: false, day: null, reason: "" };

  const times = ["08:30", "09:00", "09:30", "10:00", "11:00", "14:00", "16:30", "17:00", "18:00", "18:30"];
  let n = 0;
  const reservations = [];
  const R = (vehicleId, client, start, end, status, extra = {}) => {
    n++;
    const v = vehicles.find((x) => x.id === vehicleId);
    reservations.push({
      id: "R-" + String(2400 + n), vehicleId, customerId: cust(client).id, client, start, end, status,
      tStart: times[n % 5], tEnd: times[5 + (n % 5)],
      price: Math.max(1, end - start) * v.price,
      kmStart: status === "en_cours" ? v.km - 180 * Math.max(1, -start) : null,
      fuelStart: status === "en_cours" ? 100 : null,
      photosOut: [], photosIn: [], reason: "", requestedDay: start - 10, ...extra,
    });
  };

  // Historique
  R("v16", "Paul Henry", -25, -22, "terminee");
  R("v1", "Camille Durand", -13, -9, "terminee");   R("v1", "Hugo Martin", -7, -3, "terminee");
  R("v2", "Léa Bernard", -12, -8, "terminee");      R("v2", "Nathan Petit", -5, -1, "terminee");
  R("v4", "Inès Moreau", -14, -10, "terminee");     R("v4", "Lucas Garnier", -7, -3, "terminee");
  R("v5", "Chloé Laurent", -11, -6, "terminee");    R("v5", "Tom Roux", -4, -1, "terminee");
  R("v6", "Manon Fournier", -10, -5, "terminee");
  R("v7", "Atelier Lefèvre SARL", -9, -7, "terminee"); R("v7", "Déménagements Rapid'", -6, -3, "terminee");
  R("v8", "Sarah Girard", -13, -6, "terminee");
  R("v9", "Julien Bonnet", -8, -4, "terminee");
  R("v10", "Emma Lambert", -12, -5, "terminee");
  R("v11", "Antoine Mercier", -8, -4, "terminee");
  R("v12", "Zoé Faure", -11, -8, "terminee");       R("v12", "Maxime Blanc", -6, -3, "terminee");
  R("v13", "Clara Rousseau", -9, -2, "terminee");
  R("v15", "Louis Vincent", -14, -7, "terminee");
  R("v16", "Jade Muller", -10, -4, "terminee");

  // En cours (v8 est en retard)
  R("v1", "Paul Henry", -1, 3, "en_cours");
  R("v4", "Raphaël Dubois", -2, 2, "en_cours");
  R("v7", "Bâtiments Morel", -2, 0, "en_cours");
  R("v8", "Kevin André", -3, -1, "en_cours");
  R("v9", "Mathilde Roy", -1, 5, "en_cours");
  R("v11", "Victor Leroy", -3, 1, "en_cours");
  R("v13", "Nicolas Perrin", -1, 0, "en_cours");
  R("v15", "Élodie Masson", -4, 6, "en_cours");

  // À venir
  R("v2", "Alice Chevalier", 0, 4, "confirmee");
  R("v5", "Sophie Lemoine", 0, 2, "confirmee");
  R("v12", "Lina Gauthier", 0, 3, "confirmee");
  R("v6", "Benjamin Robin", 2, 6, "confirmee");
  R("v10", "Anaïs Caron", 1, 4, "confirmee");
  R("v16", "Théo Picard", 3, 8, "confirmee");
  R("v1", "Margaux Colin", 4, 9, "confirmee");
  R("v9", "Quentin Brun", 6, 10, "confirmee");
  R("v3", "Pauline Fabre", 5, 8, "confirmee");
  R("v4", "Arthur Guérin", 3, 7, "confirmee");
  R("v8", "Lucie Noël", 2, 5, "confirmee");
  R("v11", "Hôtel Belvédère", 2, 6, "confirmee");
  R("v13", "Romain Gaillard", 1, 5, "confirmee");
  R("v2", "Céline Arnaud", 6, 11, "confirmee");

  // Demandes envoyées depuis l'espace client, à valider par l'agence
  R("v5", "Inès Haddad", 4, 7, "demande", { tStart: "10:00", tEnd: "18:00", requestedDay: -1 });
  R("v10", "Yanis Benali", 6, 9, "demande", { tStart: "09:00", tEnd: "17:00", requestedDay: 0 });

  return { vehicles, customers, reservations, nextId: 2400 + n + 1, savedOn: TODAY.getTime() };
}

/* =========================================================
   Sauvegarde dans le navigateur (facultative : la démo marche sans)
   ========================================================= */
const CAN_STORE = (() => { try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return true; } catch (e) { return false; } })();

/* Le prototype se recale sur la date du jour : si les données datent
   d'un autre jour, tous les jours relatifs sont décalés. */
function load() {
  if (!CAN_STORE) return null;
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!data || !data.customers) return null;
    const shift = Math.round((data.savedOn - TODAY.getTime()) / 864e5);
    if (shift) {
      data.reservations.forEach((r) => { r.start += shift; r.end += shift; r.requestedDay += shift; });
      data.vehicles.forEach((v) => { v.ctDays += shift; });
      data.customers.forEach((c) => { c.since += shift; Object.values(c.docs).forEach((d) => { if (d.day != null) d.day += shift; }); });
      data.savedOn = TODAY.getTime();
    }
    return data;
  } catch (e) { return null; }
}
function save() {
  if (!CAN_STORE) return true;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}
function loadSession() {
  if (!CAN_STORE) return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}
function saveSession() {
  if (!CAN_STORE) return;
  try { session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

let state = load() || seed();
let session = loadSession();
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
};
