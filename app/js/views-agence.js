/* =========================================================
   ESPACE AGENCE
   ========================================================= */

/* ---------- Tableau de bord ---------- */
function renderDashboard() {
  const vehicles = visibleVehicles();
  const res = visibleRes();
  const counts = Object.fromEntries(Object.keys(VEHICLE_STATUS).map((k) => [k, 0]));
  vehicles.forEach((v) => counts[vehicleStatus(v)]++);
  const rentable = vehicles.filter((v) => v.state === "ok");
  const occ = occupancy(0, vehicles);
  const departures = res.filter((r) => r.status === "confirmee" && r.start === 0);
  const returns = res.filter((r) => r.status === "en_cours" && r.end === 0);
  const late = res.filter(isLate);
  const requests = res.filter((r) => r.status === "demande");
  const revenue = res.filter((r) => ["confirmee", "en_cours", "terminee"].includes(r.status) && r.start >= -30 && r.start <= 0).reduce((s, r) => s + r.price, 0);
  const upcoming = res.filter((r) => r.status === "confirmee" && r.start > 0 && r.start <= 7).length;

  const order = ["location", "reserve", "disponible", "retard", "entretien", "hs"];
  const total = vehicles.length || 1;
  const split = order.filter((k) => counts[k]).map((k) => `<i style="width:${(counts[k] / total) * 100}%;background:${STATUS_COLOR[k]}" title="${VEHICLE_STATUS[k]} : ${counts[k]}"></i>`).join("");
  const legend = order.map((k) => `<button data-action="fleet-filter" data-status="${k}"><span class="swatch" style="background:${STATUS_COLOR[k]}"></span>${VEHICLE_STATUS[k]} <b>${counts[k]}</b></button>`).join("");

  const todo = [
    ...requests.map((r) => ({ c: "var(--wait)", title: `Demande à valider : ${esc(r.client)}`, meta: `${esc(byId(r.vehicleId).model)} · ${fmtShort(r.start)} → ${fmtShort(r.end)}`, action: `<button class="btn btn--sm" data-action="review" data-id="${r.id}">Examiner</button>` })),
    ...late.map((r) => ({ c: "var(--late)", title: `Retour en retard : ${esc(byId(r.vehicleId).model)}`, meta: `${esc(r.client)} · attendu ${fmtRel(r.end)} · ${-r.end} j de retard`, action: `<button class="btn btn--sm" data-action="checkin" data-id="${r.id}">Clôturer</button>` })),
    ...departures.map((r) => ({ c: "var(--res)", title: `Départ ${r.tStart} : ${esc(byId(r.vehicleId).model)}`, meta: `${esc(r.client)} · ${agencyName(byId(r.vehicleId).agency)}`, action: `<button class="btn btn--sm" data-action="checkout" data-id="${r.id}">Remettre les clés</button>` })),
    ...returns.map((r) => ({ c: "var(--loc)", title: `Retour ${r.tEnd} : ${esc(byId(r.vehicleId).model)}`, meta: `${esc(r.client)} · ${agencyName(byId(r.vehicleId).agency)}`, action: `<button class="btn btn--sm" data-action="checkin" data-id="${r.id}">Clôturer</button>` })),
    ...alerts(vehicles).map((a) => ({ c: a.sev === "late" ? "var(--late)" : "var(--maint)", title: esc(a.text), meta: `${esc(a.v.model)} · ${esc(a.v.plate)}`, action: `<button class="btn btn--sm btn--ghost" data-action="open-vehicle" data-id="${a.v.id}">Voir</button>` })),
  ];

  return `
    <section class="kpis">
      <div class="kpi kpi--hero">
        <div class="kpi__label">Taux d'occupation</div>
        <div class="kpi__value num">${occ}<small>%</small></div>
        <div class="rev"><i style="width:${occ}%"></i></div>
        <div class="kpi__hint">${vehicles.length} véhicules, dont ${rentable.length} louables</div>
      </div>
      <div class="kpi"><div class="kpi__label">En location</div><div class="kpi__value num">${counts.location + counts.retard}</div><div class="kpi__hint">${counts.retard ? `<span style="color:var(--late)">${counts.retard} en retard</span>` : "Aucun retard"}</div></div>
      <div class="kpi"><div class="kpi__label">Disponibles</div><div class="kpi__value num" style="color:var(--ok)">${counts.disponible}</div><div class="kpi__hint">${upcoming} réservations sur 7 jours</div></div>
      <div class="kpi"><div class="kpi__label">Demandes à valider</div><div class="kpi__value num" style="color:var(--wait)">${requests.length}</div><div class="kpi__hint">Documents à vérifier</div></div>
      <div class="kpi"><div class="kpi__label">Chiffre d'affaires 30 j</div><div class="kpi__value num">${money.format(revenue).replace(/\s?€/, "")}<small> €</small></div><div class="kpi__hint">Locations démarrées sur 30 jours</div></div>
    </section>

    <section class="box">
      <div class="section-title"><h2>État de la flotte</h2><span>Cliquez sur un statut pour filtrer la flotte</span></div>
      <div class="split">${split}</div>
      <div class="legend">${legend}</div>
    </section>

    <div class="dash-grid">
      <section class="box">
        <div class="section-title"><h2>Occupation jour par jour</h2><span>13 jours passés, aujourd'hui, 7 jours réservés</span></div>
        ${occupancyChart(vehicles)}
        <div class="chart-legend">
          <span><span class="swatch" style="background:#3a3a4e"></span> Réalisé</span>
          <span><span class="swatch" style="background:var(--accent)"></span> Aujourd'hui</span>
          <span><span class="swatch" style="background:repeating-linear-gradient(-45deg,#5a5a72 0 2px,transparent 2px 4px);border:1px solid #4a4a60"></span> Déjà réservé</span>
        </div>
      </section>
      <section class="box">
        <div class="section-title"><h2>À traiter</h2><span>${todo.length} action${todo.length > 1 ? "s" : ""}</span></div>
        ${todo.length ? `<ul class="todo">${todo.map((t) => `
          <li style="--c:${t.c}"><span class="todo__stripe"></span><div><div class="todo__title">${t.title}</div><div class="todo__meta">${t.meta}</div></div>${t.action}</li>`).join("")}</ul>`
          : `<p class="empty">Rien à traiter. Toute la flotte roule.</p>`}
      </section>
    </div>`;
}

function occupancyChart(vehicles) {
  const days = []; for (let d = -13; d <= 7; d++) days.push(d);
  const W = 640, H = 230, L = 40, R = 8, T = 22, B = 196;
  const slot = (W - L - R) / days.length, bw = slot * 0.62;
  const y = (p) => B - ((B - T) * p) / 100;
  const grid = [0, 25, 50, 75, 100].map((p) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}"/><text class="axis" x="${L - 8}" y="${y(p) + 4}" text-anchor="end">${p}%</text>`).join("");
  const bars = days.map((d, i) => {
    const p = occupancy(d, vehicles);
    const x = L + i * slot + (slot - bw) / 2;
    const cls = d === 0 ? "bar bar--today" : d > 0 ? "bar bar--future" : "bar";
    const h = Math.max(1, B - y(p));
    const label = d === 0 ? `<text class="val" x="${x + bw / 2}" y="${y(p) - 6}" text-anchor="middle">${p}%</text>` : "";
    const tick = (d === 0 || d % 3 === 0) ? `<text class="axis" x="${x + bw / 2}" y="${B + 18}" text-anchor="middle"${d === 0 ? ' style="fill:var(--headlight);font-weight:700"' : ""}>${d === 0 ? "Auj." : dateOf(d).getDate()}</text>` : "";
    return `<rect class="${cls}" x="${x}" y="${B - h}" width="${bw}" height="${h}" rx="2"><title>${fmtDate(d)} : ${p} %</title></rect>${label}${tick}`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Taux d'occupation par jour">
    <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#1d1d28"/><rect width="2" height="5" fill="#5a5a72"/></pattern></defs>
    ${grid}${bars}</svg>`;
}

/* ---------- Demandes ---------- */
function renderRequests() {
  const reqs = pendingRequests().sort((a, b) => a.start - b.start);
  const docsOnly = customersWithPendingDocs();
  const decided = visibleRes().filter((r) => r.status === "refusee").slice(-5).reverse();
  return `
    <section class="box">
      <div class="section-title"><h2>Réservations à valider</h2><span>Vérifiez les documents du client avant d'accepter.</span></div>
      ${reqs.length ? reqs.map((r) => {
        const v = byId(r.vehicleId), c = custById(r.customerId);
        return `<div class="req">
          <img class="req__img" src="${photoOf(v)}" alt="">
          <div style="min-width:0">
            <div class="req__who">${esc(c.name)} <span class="muted" style="font-weight:500">· demandé ${fmtRel(r.requestedDay)}</span></div>
            <div class="car__meta">${esc(v.model)} · ${agencyName(v.agency)} · ${fmtShort(r.start)} → ${fmtShort(r.end)} (${nights(r)} j) · ${money.format(r.price)}</div>
            <div class="req__tags">${miniDocs(c)}</div>
          </div>
          <div><button class="btn btn--primary btn--sm" data-action="review" data-id="${r.id}">Examiner la demande</button></div>
        </div>`;
      }).join("") : `<p class="empty">Aucune demande en attente.</p>`}
    </section>
    <section class="box">
      <div class="section-title"><h2>Documents envoyés</h2><span>Clients sans réservation en attente</span></div>
      ${docsOnly.length ? docsOnly.map((c) => `
        <div class="req" style="grid-template-columns:auto minmax(0,1fr) auto">
          <span class="avatar">${initials(c.name)}</span>
          <div style="min-width:0"><div class="req__who">${esc(c.name)}</div><div class="car__meta">${esc(c.email)}</div><div class="req__tags">${miniDocs(c)}</div></div>
          <div><button class="btn btn--sm" data-action="open-customer" data-id="${c.id}">Vérifier</button></div>
        </div>`).join("") : `<p class="empty">Aucun document en attente.</p>`}
    </section>
    <section class="box">
      <div class="section-title"><h2>Dernières demandes refusées</h2></div>
      ${decided.length ? `<ul class="hist">${decided.map((r) => `<li><button class="link-btn" style="color:var(--fg)" data-action="open-res" data-id="${r.id}">${esc(r.client)}</button><span>${esc(r.reason)}</span></li>`).join("")}</ul>` : `<p class="empty">Aucune demande refusée.</p>`}
    </section>`;
}

/* ---------- Flotte ---------- */
function renderFleet() {
  const vehicles = visibleVehicles();
  const counts = { all: vehicles.length };
  vehicles.forEach((v) => { const s = vehicleStatus(v); counts[s] = (counts[s] || 0) + 1; });
  const chips = ["all", "disponible", "reserve", "location", "retard", "entretien", "hs"]
    .filter((k) => k === "all" || counts[k])
    .map((k) => `<button class="chip" data-action="fleet-filter" data-status="${k}" aria-pressed="${ui.fleet.status === k}">${k === "all" ? "Tous" : VEHICLE_STATUS[k]}<b>${counts[k] || 0}</b></button>`).join("");
  return `
    <div class="filters">
      <div class="chips">${chips}</div>
      <div class="field-inline">
        <select class="select" id="fleet-cat" aria-label="Catégorie">
          <option value="all">Toutes catégories</option>
          ${CATEGORIES.map((c) => `<option ${ui.fleet.cat === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <input class="input" id="fleet-q" type="search" placeholder="Immatriculation, modèle, client…" value="${esc(ui.fleet.q)}" aria-label="Rechercher">
      </div>
    </div>
    <div class="cars" id="fleet-grid">${fleetCards()}</div>`;
}
function fleetCards() {
  const q = ui.fleet.q.trim().toLowerCase();
  const list = visibleVehicles().filter((v) => {
    const s = vehicleStatus(v);
    if (ui.fleet.status !== "all" && s !== ui.fleet.status) return false;
    if (ui.fleet.cat !== "all" && v.cat !== ui.fleet.cat) return false;
    if (!q) return true;
    const cur = currentRes(v) || nextRes(v);
    return [v.plate, v.model, v.cat, cur && cur.client].some((x) => x && x.toLowerCase().includes(q));
  });
  if (!list.length) return `<p class="empty">Aucun véhicule ne correspond à ces filtres.</p>`;
  return list.map((v) => {
    const s = vehicleStatus(v);
    return `
      <button class="car" style="--c:${STATUS_COLOR[s]}" data-action="open-vehicle" data-id="${v.id}">
        <span class="car__img"><img src="${photoOf(v)}" alt="" loading="lazy"></span>
        <span class="car__body">
          <span class="car__top">${plate(v.plate)}${vPill(v)}</span>
          <span><span class="car__model" style="display:block">${esc(v.model)}</span><span class="car__meta">${v.cat} · ${agencyName(v.agency)}</span></span>
          <span class="car__row"><span>Compteur</span><b class="num">${fmtKm(v.km)}</b></span>
          <span class="fuel"><span class="car__meta" style="width:66px">${fuelLabel(v)}</span><span class="fuel__bar"><i class="${v.fuel < 25 ? "low" : ""}" style="width:${v.fuel}%"></i></span><b class="num" style="font-size:13px">${v.fuel}%</b></span>
          <span class="car__next">${nextLine(v)}</span>
        </span>
      </button>`;
  }).join("");
}
function nextLine(v) {
  const s = vehicleStatus(v), cur = currentRes(v), nxt = nextRes(v);
  if (s === "retard") return `<span style="color:var(--late)">Attendu ${fmtRel(cur.end)} · ${esc(cur.client)}</span>`;
  if (s === "location") return `Retour ${fmtRel(cur.end)} ${cur.tEnd} · ${esc(cur.client)}`;
  if (s === "reserve") return `Départ aujourd'hui ${nxt.tStart} · ${esc(nxt.client)}`;
  if (s === "entretien" || s === "hs") return esc(v.note || "Immobilisé");
  return nxt ? `Prochaine location ${fmtRel(nxt.start)} · ${esc(nxt.client)}` : "Libre, aucune réservation à venir";
}

/* ---------- Planning ---------- */
function renderPlanning() {
  const ws = ui.planStart, DAYS = 14;
  const head = Array.from({ length: DAYS }, (_, i) => {
    const d = ws + i, date = dateOf(d), we = date.getDay() === 0 || date.getDay() === 6;
    return `<div class="g-day${d === 0 ? " is-today" : ""}${we ? " is-we" : ""}">${date.toLocaleDateString("fr-FR", { weekday: "short" })}<b>${date.getDate()}</b></div>`;
  }).join("");
  const pos = (start, end) => {
    const left = Math.max(0, (start - ws + 0.3) * 100 / DAYS);
    const right = Math.min(100, (end - ws + 0.78) * 100 / DAYS);
    return right > left ? `left:calc(${left}% + 1px);width:calc(${right - left}% - 2px)` : null;
  };
  const vehicles = visibleVehicles().slice().sort((a, b) => a.agency.localeCompare(b.agency) || CATEGORIES.indexOf(a.cat) - CATEGORIES.indexOf(b.cat));
  let lastAgency = null;
  const rows = vehicles.map((v) => {
    let group = "";
    if (ui.agency === "all" && v.agency !== lastAgency) { lastAgency = v.agency; group = `<div class="g-group">${agencyName(v.agency)}</div>`; }
    const bars = state.reservations.filter((r) => r.vehicleId === v.id && ["demande", "confirmee", "en_cours", "terminee"].includes(r.status)).map((r) => {
      const style = pos(r.start, effectiveEnd(r));
      if (!style) return "";
      const label = r.status === "demande" ? `À valider · ${esc(r.client)}` : esc(r.client);
      return `<button class="g-bar g-bar--${resKey(r)}" style="${style}" data-action="${r.status === "demande" ? "review" : "open-res"}" data-id="${r.id}" title="${esc(r.client)} · ${fmtDate(r.start)} → ${fmtDate(r.end)}">${label}</button>`;
    }).join("");
    let block = "";
    if (v.state !== "ok") {
      const style = pos(0, v.state === "entretien" ? 2 : ws + DAYS);
      if (style) block = `<div class="g-block" style="--c:${STATUS_COLOR[v.state]};${style}">${v.state === "entretien" ? "Entretien" : "Hors service"}</div>`;
    }
    const today = -ws >= 0 && -ws < DAYS ? `<div class="g-today" style="left:${(-ws * 100) / DAYS}%"></div>` : "";
    return `${group}<div class="g-row">
      <button class="g-label" data-action="open-vehicle" data-id="${v.id}">${plate(v.plate)}<small>${esc(v.model)}</small></button>
      <div class="g-track" data-vid="${v.id}">${today}${block}${bars}</div>
    </div>`;
  }).join("");
  return `
    <div class="plan-bar">
      <button class="btn btn--sm" data-action="plan-shift" data-step="-7" aria-label="Semaine précédente">‹</button>
      <button class="btn btn--sm" data-action="plan-today">Aujourd'hui</button>
      <button class="btn btn--sm" data-action="plan-shift" data-step="7" aria-label="Semaine suivante">›</button>
      <span class="range">${fmtDate(ws, { day: "numeric", month: "long" })} → ${fmtDate(ws + DAYS - 1, { day: "numeric", month: "long" })}</span>
      <div class="plan-legend" style="margin-left:auto">
        <span><span class="swatch" style="background:var(--wait)"></span>À valider</span>
        <span><span class="swatch" style="background:var(--res)"></span>Confirmée</span>
        <span><span class="swatch" style="background:var(--loc)"></span>En cours</span>
        <span><span class="swatch" style="background:var(--late)"></span>En retard</span>
        <span><span class="swatch" style="background:var(--hs)"></span>Terminée</span>
      </div>
    </div>
    <p class="car__meta">Cliquez sur une case vide pour réserver ce véhicule à cette date, ou sur une réservation pour la gérer.</p>
    <div class="gantt-wrap"><div class="gantt">
      <div class="g-head"><div class="g-corner">Véhicule</div><div class="g-days">${head}</div></div>
      ${rows}
    </div></div>`;
}

/* ---------- Départs & retours ---------- */
function renderMoves() {
  const res = visibleRes();
  const deps = res.filter((r) => r.status === "confirmee" && r.start === 0).sort((a, b) => a.tStart.localeCompare(b.tStart));
  const rets = res.filter((r) => r.status === "en_cours" && r.end <= 0).sort((a, b) => a.end - b.end || a.tEnd.localeCompare(b.tEnd));
  const tomorrow = res.filter((r) => (r.status === "confirmee" && r.start === 1) || (r.status === "en_cours" && r.end === 1));
  const row = (r, time, btn) => {
    const v = byId(r.vehicleId), c = custById(r.customerId);
    return `<div class="move">
      <div class="move__who">${esc(r.client)}</div>
      <div class="move__time" style="grid-row:span 2;text-align:right">${time}</div>
      <div class="move__meta">${plate(v.plate)} ${esc(v.model)} · ${agencyName(v.agency)} ${isLate(r) ? pill("retard", `${-r.end} j de retard`) : ""} ${r.status === "confirmee" && !docsValid(c) ? pill("refuse", "Documents à vérifier") : ""}</div>
      <div class="row-actions" style="grid-column:1/-1;margin-top:4px">${btn}<button class="btn btn--sm btn--ghost" data-action="open-res" data-id="${r.id}">Détails</button></div>
    </div>`;
  };
  return `
    <div class="cols">
      <section class="box">
        <div class="section-title"><h2>Départs du jour</h2><span>${deps.length}</span></div>
        ${deps.length ? deps.map((r) => row(r, r.tStart, `<button class="btn btn--sm btn--primary" data-action="checkout" data-id="${r.id}">Remettre les clés</button>`)).join("") : `<p class="empty">Aucun départ prévu aujourd'hui.</p>`}
      </section>
      <section class="box">
        <div class="section-title"><h2>Retours attendus</h2><span>${rets.length}</span></div>
        ${rets.length ? rets.map((r) => row(r, isLate(r) ? `<span style="color:var(--late)">${fmtShort(r.end)}</span>` : r.tEnd, `<button class="btn btn--sm btn--primary" data-action="checkin" data-id="${r.id}">Clôturer le retour</button>`)).join("") : `<p class="empty">Aucun retour attendu aujourd'hui.</p>`}
      </section>
    </div>
    <section class="box">
      <div class="section-title"><h2>Demain</h2><span>${tomorrow.length} mouvement${tomorrow.length > 1 ? "s" : ""}</span></div>
      ${tomorrow.length ? `<ul class="hist">${tomorrow.map((r) => {
        const v = byId(r.vehicleId), dep = r.status === "confirmee";
        return `<li><span>${dep ? "Départ" : "Retour"} ${dep ? r.tStart : r.tEnd}</span><strong>${esc(r.client)}</strong><span>${esc(v.model)} · ${esc(v.plate)}</span></li>`;
      }).join("")}</ul>` : `<p class="empty">Rien de prévu demain.</p>`}
    </section>`;
}

/* ---------- Entretien ---------- */
function renderMaintenance() {
  const SEV = { ok: "var(--ok)", soon: "var(--maint)", late: "var(--late)" };
  const rank = (v) => { const m = maintenanceInfo(v); return v.state !== "ok" ? 0 : (m.service !== "ok" || m.ct !== "ok") ? 1 : 2; };
  const vehicles = visibleVehicles().slice().sort((a, b) => rank(a) - rank(b) || (a.nextServiceKm - a.km) - (b.nextServiceKm - b.km));
  const rows = vehicles.map((v) => {
    const m = maintenanceInfo(v);
    const pct = Math.max(0, Math.min(100, 100 - (m.kmLeft / 15000) * 100));
    let actions;
    if (v.state === "entretien") actions = `<button class="btn btn--sm btn--primary" data-action="maint-done" data-id="${v.id}">Entretien terminé</button>`;
    else if (v.state === "hs") actions = `<button class="btn btn--sm" data-action="restore" data-id="${v.id}">Remettre en service</button>`;
    else actions = `<button class="btn btn--sm" data-action="send-maint" data-id="${v.id}" ${currentRes(v) ? "disabled title='Véhicule en location'" : ""}>Envoyer en entretien</button>`;
    return `<tr>
      <td>${plate(v.plate)}</td>
      <td><strong>${esc(v.model)}</strong><div class="car__meta">${agencyName(v.agency)}</div></td>
      <td>${vPill(v)}</td>
      <td><div class="meter" style="--c:${SEV[m.service]}"><span class="sev num">${m.kmLeft <= 0 ? `Dépassée de ${fmtKm(-m.kmLeft)}` : `Dans ${fmtKm(m.kmLeft)}`}</span><span class="meter__bar"><i style="width:${pct}%"></i></span><small class="num">à ${fmtKm(v.nextServiceKm)} · compteur ${fmtKm(v.km)}</small></div></td>
      <td><span class="sev num" style="--c:${SEV[m.ct]}">${m.ct === "late" ? "Expiré" : `${v.ctDays} j`}</span><div class="car__meta">${fmtDate(v.ctDays, { day: "numeric", month: "short", year: "numeric" })}</div></td>
      <td class="actions">${actions}</td>
    </tr>`;
  }).join("");
  const a = alerts();
  return `
    <section class="kpis">
      <div class="kpi"><div class="kpi__label">Immobilisés</div><div class="kpi__value num" style="color:var(--maint)">${visibleVehicles().filter((v) => v.state !== "ok").length}</div><div class="kpi__hint">En entretien ou hors service</div></div>
      <div class="kpi"><div class="kpi__label">Révisions à prévoir</div><div class="kpi__value num">${a.filter((x) => x.kind === "service").length}</div><div class="kpi__hint">Seuil d'alerte : 1 500 km</div></div>
      <div class="kpi"><div class="kpi__label">Contrôles techniques</div><div class="kpi__value num">${a.filter((x) => x.kind === "ct").length}</div><div class="kpi__hint">Échéance sous 30 jours</div></div>
    </section>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Immat.</th><th>Véhicule</th><th>Statut</th><th>Prochaine révision</th><th>Contrôle technique</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

/* ---------- Clients ---------- */
function renderCustomers() {
  const list = state.customers.slice().sort((a, b) => docsToFix(b) - docsToFix(a) || a.name.localeCompare(b.name));
  const rows = list.map((c) => {
    const res = state.reservations.filter((r) => r.customerId === c.id);
    const cur = res.find((r) => r.status === "en_cours");
    return `<tr>
      <td><strong>${esc(c.name)}</strong><div class="car__meta">${esc(c.email)}</div></td>
      <td>${miniDocs(c)}</td>
      <td>${cur ? `${esc(byId(cur.vehicleId).model)} · retour ${fmtRel(cur.end)}` : `<span class="muted">—</span>`}</td>
      <td class="num">${res.filter((r) => r.status !== "annulee" && r.status !== "refusee").length}</td>
      <td class="actions"><button class="btn btn--sm" data-action="open-customer" data-id="${c.id}">Ouvrir</button></td>
    </tr>`;
  }).join("");
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>Client</th><th>Documents</th><th>Location en cours</th><th>Locations</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}
