/* =========================================================
   ESPACE CLIENT
   ========================================================= */
function renderMyRental() {
  const c = me();
  const mine = state.reservations.filter((r) => r.customerId === c.id);
  const cur = mine.find((r) => r.status === "en_cours");
  const next = mine.filter((r) => r.status === "confirmee").sort((a, b) => a.start - b.start)[0];
  const pending = mine.filter((r) => r.status === "demande");
  const refused = mine.filter((r) => r.status === "refusee").slice(-1)[0];

  let hero;
  if (cur) hero = rideCard(cur, "return");
  else if (next) hero = rideCard(next, "departure");
  else hero = `
    <section class="box" style="text-align:center;padding:36px 18px">
      <p class="kicker">Aucune location en cours</p>
      <h2 class="ride__model" style="margin:10px 0 8px">Prêt à prendre la route ?</h2>
      <p class="muted" style="margin:0 auto 18px;max-width:46ch">Choisissez une agence, vos dates et un véhicule. L'agence vérifie vos documents puis confirme votre réservation.</p>
      <button class="btn btn--primary" data-action="nav" data-view="reserver">Réserver un véhicule</button>
    </section>`;

  const pendingHtml = pending.map((r) => {
    const v = byId(r.vehicleId);
    const docsOk = docsValid(c);
    return `<section class="box">
      <div class="section-title"><h2>Demande ${esc(r.id)} en cours</h2><span>${esc(v.model)} · ${fmtShort(r.start)} → ${fmtShort(r.end)} · ${agencyName(v.agency)}</span></div>
      <ol class="steps">
        <li class="done">Demande envoyée</li>
        <li class="${docsOk ? "done" : docsToFix(c) ? "failed" : "current"}">Vérification des documents</li>
        <li class="${docsOk ? "current" : ""}">Confirmation par l'agence</li>
        <li>Départ</li>
      </ol>
      ${docsToFix(c) ? `<div class="callout" style="--c:var(--late);margin-top:14px">Un document a été jugé non conforme. <button class="link-btn" style="color:var(--fg)" data-action="nav" data-view="mes-documents">Envoyer un nouveau document</button></div>` : ""}
    </section>`;
  }).join("");

  const refusedHtml = refused && !cur && !next && !pending.length ? `
    <div class="callout" style="--c:var(--late)"><strong>Votre demande ${esc(refused.id)} a été refusée.</strong> Motif : ${esc(refused.reason)}.
    ${docsToFix(c) ? ` Mettez à jour vos documents puis faites une nouvelle demande.` : ""}</div>` : "";

  const agencyKey = cur ? byId(cur.vehicleId).agency : next ? byId(next.vehicleId).agency : ui.search.agency;
  const ag = AGENCIES[agencyKey];
  return `
    ${refusedHtml}
    ${hero}
    ${pendingHtml}
    <div class="cols">
      <section class="box">
        <div class="section-title"><h2>Mes documents</h2><span>${docsValid(c) ? "Tous conformes" : docsSent(c) ? "En cours de vérification" : "À compléter"}</span></div>
        <ul class="hist">${docsList(c).map((d) => `<li><strong style="font-weight:600">${DOC_TYPES[d.type].label}</strong>${dPill(d)}</li>`).join("")}</ul>
        ${docsValid(c) ? "" : `<button class="btn btn--sm" style="margin-top:12px" data-action="nav" data-view="mes-documents">Gérer mes documents</button>`}
      </section>
      <section class="box">
        <div class="section-title"><h2>Mon agence</h2><span>${ag.name}</span></div>
        <ul class="hist">
          <li><span>Adresse</span><strong style="font-weight:600">${ag.address}</strong></li>
          <li><span>Téléphone</span><strong class="num" style="font-weight:600;user-select:all">${ag.phone}</strong></li>
          <li><span>Horaires</span><strong style="font-weight:600">7 h – 21 h, 7 j/7</strong></li>
        </ul>
      </section>
    </div>`;
}

/* Carte de location avec compte à rebours (retour ou départ). */
function rideCard(r, mode) {
  const v = byId(r.vehicleId);
  const target = mode === "return" ? atTime(r.end, r.tEnd) : atTime(r.start, r.tStart);
  const start = mode === "return" ? atTime(r.start, r.tStart) : atTime(r.requestedDay, "12:00");
  const label = mode === "return" ? "À rendre dans" : "Départ dans";
  const when = mode === "return"
    ? `À rendre <strong>${fmtRel(r.end)} à ${r.tEnd}</strong> · ${agencyName(v.agency)}`
    : `Départ <strong>${fmtRel(r.start)} à ${r.tStart}</strong> · ${agencyName(v.agency)}`;
  const facts = mode === "return" ? `
      <dl class="facts">
        <div><dt>Km inclus</dt><dd>${fmtKm(nights(r) * KM_INCLUDED_PER_DAY)}</dd></div>
        <div><dt>Compteur au départ</dt><dd>${r.kmStart != null ? fmtKm(r.kmStart) : "—"}</dd></div>
        <div><dt>${fuelLabel(v)} à rendre</dt><dd>${r.fuelStart != null ? r.fuelStart + " %" : "—"} minimum</dd></div>
        <div><dt>Au-delà</dt><dd>${money2.format(EXTRA_KM_PRICE)} / km</dd></div>
      </dl>` : `
      <dl class="facts">
        <div><dt>Durée</dt><dd>${nights(r)} jour${nights(r) > 1 ? "s" : ""}</dd></div>
        <div><dt>Montant</dt><dd>${money.format(r.price)}</dd></div>
        <div><dt>Caution</dt><dd>${money.format(DEPOSIT)} (empreinte)</dd></div>
        <div><dt>À présenter</dt><dd>Permis et pièce d'identité originaux</dd></div>
      </dl>`;
  const photos = mode === "return" && r.photosOut.length ? `<div><div class="sub-title">Photos de l'état des lieux de départ</div>${thumbGrid(r.photosOut)}</div>` : "";
  return `
    <section class="ride">
      <img class="ride__img" src="${photoOf(v)}" alt="${esc(v.model)}">
      <div class="ride__body">
        <div class="row-actions"><span class="kicker">${mode === "return" ? "Location en cours" : "Réservation confirmée"} · ${esc(r.id)}</span>${isLate(r) ? pill("retard", "En retard") : ""}</div>
        <div><h2 class="ride__model">${esc(v.model)}</h2><div style="margin-top:8px">${plate(v.plate)}</div></div>
        <div class="cd" data-countdown data-target="${target}" data-start="${start}" data-label="${label}">
          <p class="cd-label" data-cd-label style="margin-bottom:8px">${label}</p>
          <div class="countdown">
            <div><b data-unit="d">00</b><span>jours</span></div>
            <div><b data-unit="h">00</b><span>heures</span></div>
            <div><b data-unit="m">00</b><span>min</span></div>
            <div><b data-unit="s">00</b><span>s</span></div>
          </div>
          ${mode === "return" ? `<div class="progress" style="margin-top:14px"><i data-progress></i></div>
          <div class="progress-legend"><span>Départ ${fmtShort(r.start)} ${r.tStart}</span><span>Retour ${fmtShort(r.end)} ${r.tEnd}</span></div>` : ""}
        </div>
        <p class="ride__line">${when}</p>
        ${facts}
        ${photos}
      </div>
    </section>`;
}

function renderBook() {
  const c = me();
  const s = ui.search;
  const valid = s.end > s.start && s.start >= 0;
  const list = valid ? availableVehicles(s.agency, s.cat, s.start, s.end) : [];
  const days = s.end - s.start;
  const blocked = !docsSent(c);
  return `
    ${blocked ? `<div class="callout" style="--c:var(--maint)"><strong>Avant de réserver</strong>, envoyez votre permis, votre pièce d'identité et un justificatif de domicile. <button class="link-btn" style="color:var(--fg)" data-action="nav" data-view="mes-documents">Envoyer mes documents</button></div>` : ""}
    <section class="box">
      <div class="search">
        <label>Agence<select class="select" id="cr-agency">${Object.entries(AGENCIES).map(([k, a]) => `<option value="${k}" ${s.agency === k ? "selected" : ""}>${a.name}</option>`).join("")}</select></label>
        <label>Catégorie<select class="select" id="cr-cat"><option value="all">Toutes</option>${CATEGORIES.map((cat) => `<option ${s.cat === cat ? "selected" : ""}>${cat}</option>`).join("")}</select></label>
        <label>Départ<input class="input" type="date" id="cr-start" value="${isoOf(s.start)}" min="${isoOf(0)}"></label>
        <label>Retour<input class="input" type="date" id="cr-end" value="${isoOf(s.end)}" min="${isoOf(1)}"></label>
      </div>
    </section>
    <div class="section-title"><h2>${valid ? `${list.length} véhicule${list.length > 1 ? "s" : ""} disponible${list.length > 1 ? "s" : ""}` : "Vérifiez vos dates"}</h2><span>${valid ? `${days} jour${days > 1 ? "s" : ""} · ${days * KM_INCLUDED_PER_DAY} km inclus · ${AGENCIES[s.agency].name}` : "La date de retour doit être après la date de départ."}</span></div>
    ${valid && !list.length ? `<p class="empty">Aucun véhicule libre sur ces dates dans cette agence. Essayez une autre catégorie ou d'autres dates.</p>` : ""}
    <div class="cars">${list.map((v) => `
      <article class="car">
        <span class="car__img"><img src="${photoOf(v)}" alt="${esc(v.model)}" loading="lazy"></span>
        <div class="car__body">
          <div><div class="car__model">${esc(v.model)}</div><div class="car__meta">${v.cat} · ou similaire</div></div>
          <div class="car__price"><strong>${money.format(v.price * days)}</strong><span class="car__meta">${money.format(v.price)} / jour</span></div>
          <button class="btn btn--primary" data-action="client-pick" data-vid="${v.id}">Choisir ce véhicule</button>
        </div>
      </article>`).join("")}</div>`;
}

function renderMyReservations() {
  const c = me();
  const mine = state.reservations.filter((r) => r.customerId === c.id).sort((a, b) => b.start - a.start);
  if (!mine.length) return `<section class="box"><p class="empty">Vous n'avez encore aucune réservation.</p><button class="btn btn--primary" data-action="nav" data-view="reserver">Réserver un véhicule</button></section>`;
  return `<section class="box">${mine.map((r) => {
    const v = byId(r.vehicleId);
    const cancellable = r.status === "demande" || (r.status === "confirmee" && r.start > 0);
    return `<div class="req">
      <img class="req__img" src="${photoOf(v)}" alt="">
      <div style="min-width:0">
        <div class="req__who">${esc(v.model)} <span class="muted" style="font-weight:500">· ${esc(r.id)}</span></div>
        <div class="car__meta">${fmtDate(r.start)} ${r.tStart} → ${fmtDate(r.end)} ${r.tEnd} · ${agencyName(v.agency)} · ${money.format(r.price)}</div>
        <div class="req__tags">${rPill(r)}${r.reason ? `<span class="doc__reason" style="margin:0">Motif : ${esc(r.reason)}</span>` : ""}</div>
      </div>
      <div>${cancellable ? `<button class="btn btn--sm btn--ghost" data-action="client-cancel" data-id="${r.id}">${r.status === "demande" ? "Annuler la demande" : "Annuler"}</button>` : ""}</div>
    </div>`;
  }).join("")}</section>`;
}

function renderMyDocs() {
  const c = me();
  return `
    <p class="muted" style="max-width:70ch">L'agence vérifie chaque document avant de confirmer une réservation. Envoyez une photo nette ou un scan (JPG ou PNG). Les originaux vous seront demandés au comptoir.</p>
    <div class="docs">${docsList(c).map((d) => {
      const src = docSrc(c, d.type);
      return `<div class="doc doc--lg">
        ${src ? `<button class="doc__thumb" data-action="view-doc" data-cid="${c.id}" data-type="${d.type}" aria-label="Agrandir"><img src="${src}" alt=""></button>` : `<div class="doc__thumb">Aucun fichier envoyé</div>`}
        <div>
          <div class="doc__title">${DOC_TYPES[d.type].label} ${dPill(d)}</div>
          <div class="doc__meta">${DOC_TYPES[d.type].hint}</div>
          ${d.day != null && d.status !== "manquant" ? `<div class="doc__meta">Envoyé ${fmtRel(d.day)}${d.counter ? " · original vérifié en agence" : ""}</div>` : ""}
          ${d.status === "refuse" ? `<div class="doc__reason">Refusé par l'agence : ${esc(d.reason)}. Envoyez un nouveau document.</div>` : ""}
          <div class="doc__actions">
            <label class="btn btn--sm ${d.status === "manquant" || d.status === "refuse" ? "btn--primary" : ""}">
              ${d.status === "manquant" ? "Envoyer une photo" : "Remplacer"}
              <input class="sr-only" type="file" accept="image/*" data-doc-upload="${d.type}">
            </label>
          </div>
        </div>
      </div>`;
    }).join("")}</div>`;
}
