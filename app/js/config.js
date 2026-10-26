/* =========================================================
   Constantes. Les dates sont en jours par rapport à aujourd'hui
   (0 = aujourd'hui, -1 = hier, 3 = dans 3 jours).
   ========================================================= */
const API_URL = "../api/index.php";
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

const CATEGORIES = ["Citadine", "Compacte", "SUV", "Électrique", "Premium", "Utilitaire"];
const KM_INCLUDED_PER_DAY = 250;
const EXTRA_KM_PRICE = 0.25;
const TANK_LITERS = 50;
const FUEL_PRICE = 2.10;
const CHARGE_PRICE_PER_PCT = 0.45;
const DEPOSIT = 800;

/* Comptes créés par les données d'exemple (api/db/seed.php). */
const DEMO_PASSWORD = "demo1234";
const DEMO_ACCOUNTS = [
  { email: "agence@tougefleet.demo", title: "Espace agence", hint: "Sarah Lemaire, responsable d'agence", initials: "SL", admin: true },
  { email: "paul.henry@exemple.fr", title: "Espace client", hint: "Paul Henry, location en cours", initials: "PH" },
  { email: "ines.haddad@exemple.fr", title: "Espace client", hint: "Inès Haddad, demande à valider", initials: "IH" },
];
const ADMIN_ROLE_LABEL = "Responsable d'agence";

const VEHICLE_STATUS = {
  disponible: "Disponible", reserve: "Départ aujourd'hui", location: "En location",
  retard: "Retour en retard", entretien: "En entretien", hs: "Hors service",
};
const STATUS_COLOR = { disponible: "var(--ok)", reserve: "var(--res)", location: "var(--loc)", retard: "var(--late)", entretien: "var(--maint)", hs: "var(--hs)" };
const RES_STATUS = { demande: "À valider", confirmee: "Confirmée", en_cours: "En cours", terminee: "Terminée", annulee: "Annulée", refusee: "Refusée", retard: "En retard" };

const DOC_TYPES = {
  permis: { label: "Permis de conduire", short: "Permis", hint: "Recto et verso, en cours de validité." },
  identite: { label: "Pièce d'identité", short: "Identité", hint: "Carte d'identité ou passeport en cours de validité." },
  domicile: { label: "Justificatif de domicile", short: "Domicile", hint: "Facture ou attestation de moins de 3 mois, à votre nom." },
};
const DOC_STATUS = { manquant: "À envoyer", en_attente: "En vérification", valide: "Conforme", refuse: "Non conforme" };
const DOC_REASONS = [
  "Document illisible ou flou",
  "Document expiré",
  "Nom différent du titulaire du compte",
  "Recto ou verso manquant",
  "Justificatif de plus de 3 mois",
  "Permis trop récent pour cette catégorie",
];
const RES_REASONS = [
  "Documents non conformes",
  "Permis expiré ou invalide",
  "Véhicule plus disponible sur ces dates",
  "Ancienneté du permis insuffisante pour ce véhicule",
  "Autre motif",
];
