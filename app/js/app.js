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
  personnalisation: { title: "Personnalisation", render: renderBrandEditor },
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
  const nav = Object.entries(views).map(([key, v]) => {
    const count = v.count ? v.count() : 0;
    return `<button class="nav__item" data-action="nav" data-view="${key}" ${key === ui.view ? 'aria-current="page"' : ""}>${icon(key)}${v.title}<span class="nav__count">${count || ""}</span></button>`;
  }).join("");
  const actions = admin
    ? `<span class="demo-tag">Données d'exemple</span>
       <select class="select" id="agency-switch" aria-label="Agence">
         <option value="all">Toutes les agences</option>
         ${Object.entries(AGENCIES).map(([k, a]) => `<option value="${k}" ${ui.agency === k ? "selected" : ""}>${esc(a.name)}</option>`).join("")}
       </select>
       <button class="btn btn--primary" data-action="new-res">+ Nouvelle réservation</button>`
    : `<button class="btn btn--primary" data-action="nav" data-view="reserver">Réserver un véhicule</button>`;
  return `
  <div class="app">
    <aside class="side">
      <div class="brand">
        ${brandMarkHtml()}
        <span class="brand__name">${brandNameHtml()}<span class="brand__sub">${admin ? "Espace agence" : "Espace client"}</span></span>
      </div>
      <nav class="nav" aria-label="Navigation principale">${nav}</nav>
      <div class="side__foot">
        <p class="side__note">Démo : véhicules, clients, documents et montants sont des exemples enregistrés dans la base du projet.</p>
        <button class="link-btn" data-action="logout">Changer de compte</button>
        ${admin ? `<button class="link-btn" data-action="ask-reset">Réinitialiser la démo</button>` : ""}
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <h1 class="top__title">${views[ui.view].title}</h1>
        <span class="top__date">${TODAY.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        <div class="top__actions">
          ${actions}
          <div class="user">
            <span class="avatar${admin ? " avatar--admin" : ""}">${initials(session.name)}</span>
            <div><div class="user__name">${esc(session.name)}</div><div class="user__role">${admin ? ADMIN_ROLE_LABEL : "Client"}</div></div>
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
  const login = ui.authMode === "login";
  return `
  <div class="login">
    <section class="login__art">
      <div class="brand" style="padding:0">
        ${brandMarkHtml()}
        <span class="brand__name">${brandNameHtml()}<span class="brand__sub">${esc(brand.tagline)}</span></span>
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
        ${serverError ? `<div class="callout" style="--c:var(--late)"><strong>Base de données injoignable.</strong> ${esc(serverError)}</div>` : ""}
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
          <label>Mot de passe (8 caractères minimum)<input class="input" type="password" id="su-pw" autocomplete="new-password"></label>
          <p class="form-error" id="su-error" role="alert"></p>
          <button class="btn btn--primary" type="submit">Créer mon compte client</button>
        </form>`}
        <div>
          <div class="sub-title">Comptes de démonstration</div>
          <div class="demo-acc">
            ${DEMO_ACCOUNTS.map((a) => `<button data-action="demo-login" data-email="${a.email}"><span class="avatar${a.admin ? " avatar--admin" : ""}">${a.initials}</span><span><strong>${a.title}</strong><small>${esc(a.hint)}</small></span><span aria-hidden="true">→</span></button>`).join("")}
          </div>
          <p class="note" style="margin-top:8px">Mot de passe des comptes de démonstration : ${DEMO_PASSWORD}</p>
        </div>
      </div>
    </section>
  </div>`;
}

async function signIn(email, password, errorEl) {
  try {
    const { user } = await api("login", { email, password });
    await afterLogin(user);
  } catch (e) {
    if (errorEl) errorEl.textContent = e.message; else toast(e.message);
  }
}
async function afterLogin(user, view = "") {
  setSession(user);
  await reload();
  ui.view = view;
  closePanel();
  render();
  setHash(ui.view);
}
function doLogin() {
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pw = document.getElementById("login-pw").value;
  const err = document.getElementById("login-error");
  if (!email || !pw) { err.textContent = "Saisissez votre e-mail et votre mot de passe."; return; }
  signIn(email, pw, err);
}
async function doSignup() {
  const name = document.getElementById("su-name").value.trim().replace(/\s+/g, " ");
  const email = document.getElementById("su-email").value.trim().toLowerCase();
  const password = document.getElementById("su-pw").value;
  const err = document.getElementById("su-error");
  try {
    const { user } = await api("signup", { name, email, password });
    await afterLogin(user, "mes-documents");
    toast(`Bienvenue ${name.split(" ")[0]} ! Envoyez vos documents pour pouvoir réserver.`);
  } catch (e) {
    err.textContent = e.message;
  }
}
async function logout() {
  try { await api("logout", {}); } catch (e) { /* déjà déconnecté */ }
  session = null;
  state = { vehicles: [], customers: [], reservations: [] };
  if (ui.brandDraft) { ui.brandDraft = null; applyBrand(brand); }
  ui.authMode = "login";
  closePanel();
  setHash("");
  render();
}
