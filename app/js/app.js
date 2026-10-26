/* =========================================================
   Vues
   ========================================================= */
const ADMIN_VIEWS = {
  tableau: { title: "Tableau de bord", render: renderDashboard },
  demandes: { title: "Demandes", render: renderRequests, count: () => pendingRequests().length + customersWithPendingDocs().length },
  flotte: { title: "Flotte", render: renderFleet },
  planning: { title: "Planning", render: renderPlanning },
  mouvements: { title: "Départs & retours", render: renderMoves, count: () => visibleRes().filter((r) => (r.status === "confirmee" && r.start === 0) || (r.status === "en_cours" && r.end <= 0)).length },
  entretien: { title: "Entretien", render: renderMaintenance, count: () => alerts().length },
  clients: { title: "Clients", render: renderCustomers },
};
const CLIENT_VIEWS = {
  "ma-location": { title: "Ma location", render: renderMyRental },
  reserver: { title: "Réserver", render: renderBook },
  "mes-reservations": { title: "Mes réservations", render: renderMyReservations },
  "mes-documents": { title: "Mes documents", render: renderMyDocs, count: () => docsToFix(me()) },
};

function render() {
  const app = document.getElementById("app");
  if (session && session.role === "client" && !me()) session = null;
  if (!session) { app.innerHTML = renderLogin(); return; }
  const views = session.role === "admin" ? ADMIN_VIEWS : CLIENT_VIEWS;
  if (!views[ui.view]) ui.view = Object.keys(views)[0];
  const prev = document.getElementById("view");
  const keepScroll = prev && prev.dataset.view === ui.view ? prev.scrollTop : 0;
  app.innerHTML = renderShell(views);
  document.getElementById("view").scrollTop = keepScroll;
  tick();
}

function renderShell(views) {
  const admin = session.role === "admin";
  const user = admin ? ADMIN : me();
  const nav = Object.entries(views).map(([key, v]) => {
    const count = v.count ? v.count() : 0;
    return `<button class="nav__item" data-action="nav" data-view="${key}" ${key === ui.view ? 'aria-current="page"' : ""}>${icon(key)}${v.title}<span class="nav__count">${count || ""}</span></button>`;
  }).join("");
  const actions = admin
    ? `<span class="demo-tag">Données d'exemple</span>
       <select class="select" id="agency-switch" aria-label="Agence">
         <option value="all">Toutes les agences</option>
         ${Object.entries(AGENCIES).map(([k, a]) => `<option value="${k}" ${ui.agency === k ? "selected" : ""}>${a.name}</option>`).join("")}
       </select>
       <button class="btn btn--primary" data-action="new-res">+ Nouvelle réservation</button>`
    : `<button class="btn btn--primary" data-action="nav" data-view="reserver">Réserver un véhicule</button>`;
  return `
  <div class="app">
    <aside class="side">
      <div class="brand">
        <span class="brand__kanji" aria-hidden="true">峠</span>
        <span class="brand__name">Touge<em>Fleet</em><span class="brand__sub">${admin ? "Espace agence" : "Espace client"}</span></span>
      </div>
      <nav class="nav" aria-label="Navigation principale">${nav}</nav>
      <div class="side__foot">
        <p class="side__note">Prototype : véhicules, clients, documents et montants sont des exemples. Vos changements restent dans ce navigateur.</p>
        <button class="link-btn" data-action="logout">Changer de compte</button>
        <button class="link-btn" data-action="ask-reset">Réinitialiser la démo</button>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <h1 class="top__title">${views[ui.view].title}</h1>
        <span class="top__date">${TODAY.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        <div class="top__actions">
          ${actions}
          <div class="user">
            <span class="avatar${admin ? " avatar--admin" : ""}">${initials(user.name)}</span>
            <div><div class="user__name">${esc(user.name)}</div><div class="user__role">${admin ? ADMIN.role : "Client"}</div></div>
            <button class="btn btn--sm btn--ghost" data-action="logout">Se déconnecter</button>
          </div>
        </div>
      </header>
      <main class="view" id="view" data-view="${ui.view}">${views[ui.view].render()}</main>
    </div>
  </div>`;
}

/* ---------- Connexion ---------- */
function renderLogin() {
  const paul = state.customers.find((c) => c.email === "paul.henry@exemple.fr");
  const ines = state.customers.find((c) => c.email === "ines.haddad@exemple.fr");
  const login = ui.authMode === "login";
  return `
  <div class="login">
    <section class="login__art">
      <div class="brand" style="padding:0">
        <span class="brand__kanji" aria-hidden="true">峠</span>
        <span class="brand__name">Touge<em>Fleet</em><span class="brand__sub">Location de véhicules</span></span>
      </div>
      <div>
        <h1 class="login__title">Une flotte,<br><em>une seule clé.</em></h1>
        <p class="login__lead">Les clients réservent et suivent leur location. L'agence vérifie les documents, gère la flotte et les retours.</p>
      </div>
      <svg class="login__road" viewBox="0 0 600 140" aria-hidden="true">
        <path class="r1" d="M-20 130 C 120 120, 160 60, 280 70 S 470 130, 620 40"/>
        <path class="r2" d="M-20 130 C 120 120, 160 60, 280 70 S 470 130, 620 40"/>
        <path class="r3" d="M-20 130 C 120 120, 160 60, 280 70 S 470 130, 620 40"/>
      </svg>
    </section>
    <section class="login__panel">
      <div class="login__box">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" aria-selected="${login}" data-action="auth-mode" data-mode="login">Connexion</button>
          <button class="tab" role="tab" aria-selected="${!login}" data-action="auth-mode" data-mode="signup">Créer un compte</button>
        </div>
        ${login ? `
        <form class="stack" id="login-form" novalidate>
          <label>E-mail<input class="input" type="email" id="login-email" autocomplete="username" placeholder="vous@exemple.fr"></label>
          <label>Mot de passe<input class="input" type="password" id="login-pw" autocomplete="current-password"></label>
          <p class="form-error" id="login-error" role="alert"></p>
          <button class="btn btn--primary" type="submit">Se connecter</button>
        </form>` : `
        <form class="stack" id="signup-form" novalidate>
          <label>Prénom et nom<input class="input" id="su-name" autocomplete="name" placeholder="Camille Durand"></label>
          <label>E-mail<input class="input" type="email" id="su-email" autocomplete="email" placeholder="vous@exemple.fr"></label>
          <label>Mot de passe<input class="input" type="password" id="su-pw" autocomplete="new-password"></label>
          <p class="form-error" id="su-error" role="alert"></p>
          <button class="btn btn--primary" type="submit">Créer mon compte client</button>
        </form>`}
        <p class="note">Prototype : les mots de passe ne sont ni vérifiés ni enregistrés.</p>
        <div>
          <div class="sub-title">Comptes de démonstration</div>
          <div class="demo-acc">
            <button data-action="demo-login" data-role="admin"><span class="avatar avatar--admin">${initials(ADMIN.name)}</span><span><strong>Espace agence</strong><small>${ADMIN.name}, responsable d'agence</small></span><span aria-hidden="true">→</span></button>
            ${paul ? `<button data-action="demo-login" data-role="client" data-cid="${paul.id}"><span class="avatar">PH</span><span><strong>Espace client</strong><small>Paul Henry, location en cours</small></span><span aria-hidden="true">→</span></button>` : ""}
            ${ines ? `<button data-action="demo-login" data-role="client" data-cid="${ines.id}"><span class="avatar">IH</span><span><strong>Espace client</strong><small>Inès Haddad, demande à valider</small></span><span aria-hidden="true">→</span></button>` : ""}
          </div>
        </div>
      </div>
    </section>
  </div>`;
}

function login(role, customerId) {
  session = { role, customerId: customerId || null };
  saveSession();
  ui.view = "";
  closePanel();
  render();
  setHash(ui.view);
}
function doLogin() {
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pw = document.getElementById("login-pw").value;
  const err = document.getElementById("login-error");
  if (!email || !pw) { err.textContent = "Saisissez votre e-mail et votre mot de passe."; return; }
  if (email === ADMIN.email) return login("admin");
  const c = state.customers.find((x) => x.email === email);
  if (!c) { err.textContent = "Aucun compte avec cet e-mail. Utilisez un compte de démonstration ou créez un compte."; return; }
  login("client", c.id);
}
function doSignup() {
  const name = document.getElementById("su-name").value.trim().replace(/\s+/g, " ");
  const email = document.getElementById("su-email").value.trim().toLowerCase();
  const pw = document.getElementById("su-pw").value;
  const err = document.getElementById("su-error");
  if (name.split(" ").length < 2) { err.textContent = "Indiquez votre prénom et votre nom."; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = "Cette adresse e-mail n'est pas valide."; return; }
  if (pw.length < 8) { err.textContent = "Choisissez un mot de passe d'au moins 8 caractères."; return; }
  if (email === ADMIN.email || state.customers.some((c) => c.email === email)) { err.textContent = "Un compte existe déjà avec cet e-mail. Connectez-vous."; return; }
  const c = { id: "c" + Date.now().toString(36), name, email, since: 0, docs: makeDocs("manquant", null) };
  state.customers.push(c);
  save();
  login("client", c.id);
  ui.view = "mes-documents";
  render();
  toast(`Bienvenue ${name.split(" ")[0]} ! Envoyez vos documents pour pouvoir réserver.`);
}
