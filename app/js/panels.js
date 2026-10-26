/* =========================================================
   Tiroirs et fenêtres
   ========================================================= */
const layer = document.getElementById("layer");
let lastFocus = null;
let reopen = null;

function openPanel(kind, html) {
  if (!layer.innerHTML) lastFocus = document.activeElement;
  layer.innerHTML = `<div class="overlay" data-action="close"></div><div class="${kind}" role="dialog" aria-modal="true">${html}</div>`;
  const first = layer.querySelector("#doc-reason, #res-reason, [data-autofocus], .panel__close");
  if (first) first.focus();
}
function closePanel() {
  layer.innerHTML = "";
  reopen = null;
  ui.docRefuse = null;
  ui.refusingRes = false;
  ui.pendingPhotos = [];
  if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
}
const panelHead = (title, sub) => `<div class="panel__head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button class="panel__close" data-action="close" aria-label="Fermer">×</button></div>`;
function refresh() { render(); if (reopen) reopen(); }

function openLightbox(src, caption) {
  const back = reopen;
  openPanel("modal modal--light", `${panelHead(esc(caption || "Photo"))}<div class="panel__body"><img class="lightbox-img" src="${src}" alt=""></div>
    ${back ? `<div class="panel__foot"><button class="btn" data-action="lightbox-back">Retour</button></div>` : ""}`);
  reopen = back;
}

/* ----- Véhicule ----- */
function openVehicle(id) {
  reopen = () => openVehicle(id);
  const v = byId(id);
  const m = maintenanceInfo(v);
  const cur = currentRes(v);
  const upcoming = state.reservations.filter((r) => r.vehicleId === v.id && (r.status === "confirmee" || r.status === "demande")).sort((a, b) => a.start - b.start);
  const past = state.reservations.filter((r) => r.vehicleId === v.id && r.status === "terminee").sort((a, b) => b.start - a.start).slice(0, 4);
  const resLine = (r) => `<li><button class="link-btn" data-action="open-res" data-id="${r.id}">${esc(r.client)}</button><span class="num">${fmtShort(r.start)} → ${fmtShort(r.end)}</span></li>`;
  let actions = `<button class="btn" data-action="new-res" data-vid="${v.id}" ${v.state !== "ok" ? "disabled" : ""}>Réserver ce véhicule</button>`;
  if (v.state === "ok") actions += `<button class="btn" data-action="send-maint" data-id="${v.id}" ${cur ? "disabled" : ""}>Envoyer en entretien</button><button class="btn btn--ghost" data-action="set-hs" data-id="${v.id}" ${cur ? "disabled" : ""}>Déclarer hors service</button>`;
  if (v.state === "entretien") actions += `<button class="btn btn--primary" data-action="maint-done" data-id="${v.id}">Entretien terminé</button>`;
  if (v.state === "hs") actions += `<button class="btn btn--primary" data-action="restore" data-id="${v.id}">Remettre en service</button>`;

  const gallery = `
    <div>
      <button class="gallery__main" data-action="lightbox" aria-label="Agrandir la photo"><img src="${photoOf(v)}" alt="${esc(v.model)}"></button>
      <div class="thumbs">
        ${v.photos.map((p, i) => `<div class="thumb">
          <button data-action="lightbox" aria-label="Agrandir la photo"><img src="${p}" alt=""></button>
          ${i === 0 ? `<span class="thumb__badge">Principale</span>` : ""}
          <div class="thumb__tools">
            ${i > 0 ? `<button data-action="photo-main" data-vid="${v.id}" data-pid="${v.photoIds[i]}" title="Utiliser comme photo principale" aria-label="Photo principale">★</button>` : ""}
            <button data-action="photo-del" data-vid="${v.id}" data-pid="${v.photoIds[i]}" title="Supprimer" aria-label="Supprimer la photo">✕</button>
          </div>
        </div>`).join("")}
        <label class="thumb thumb--add">+ Ajouter des photos<input class="sr-only" type="file" accept="image/*" multiple data-vehicle-photos="${v.id}"></label>
      </div>
      ${v.photos.length ? "" : `<p class="car__meta" style="margin-top:6px">Illustration par défaut. Ajoutez de vraies photos du véhicule : elles apparaîtront aussi côté client.</p>`}
    </div>`;

  openPanel("drawer", `
    ${panelHead(esc(v.model), `${v.cat} · ${agencyName(v.agency)}`)}
    <div class="panel__body">
      ${gallery}
      <div class="row-actions">${plate(v.plate, true)}${vPill(v)}</div>
      ${v.note && v.state !== "ok" ? `<div class="callout" style="--c:${STATUS_COLOR[v.state]}">${esc(v.note)}</div>` : ""}
      ${cur ? `<div class="callout" style="--c:${isLate(cur) ? "var(--late)" : "var(--loc)"}">Loué à <strong>${esc(cur.client)}</strong> depuis ${fmtRel(cur.start)}, retour ${isLate(cur) ? `attendu ${fmtRel(cur.end)} (en retard)` : `${fmtRel(cur.end)} à ${cur.tEnd}`}.</div>` : ""}
      <dl class="facts">
        <div><dt>Compteur</dt><dd>${fmtKm(v.km)}</dd></div>
        <div><dt>${fuelLabel(v)}</dt><dd>${v.fuel} %</dd></div>
        <div><dt>Tarif</dt><dd>${money.format(v.price)} / jour</dd></div>
        <div><dt>Km inclus</dt><dd>${KM_INCLUDED_PER_DAY} km / jour</dd></div>
        <div><dt>Prochaine révision</dt><dd style="color:${m.service === "ok" ? "inherit" : m.service === "late" ? "var(--late)" : "var(--maint)"}">${fmtKm(v.nextServiceKm)}</dd></div>
        <div><dt>Contrôle technique</dt><dd style="color:${m.ct === "ok" ? "inherit" : "var(--maint)"}">${fmtDate(v.ctDays, { day: "numeric", month: "short", year: "numeric" })}</dd></div>
      </dl>
      <div><div class="sub-title">Réservations à venir</div>${upcoming.length ? `<ul class="hist">${upcoming.map(resLine).join("")}</ul>` : `<p class="muted">Aucune.</p>`}</div>
      <div><div class="sub-title">Dernières locations</div>${past.length ? `<ul class="hist">${past.map(resLine).join("")}</ul>` : `<p class="muted">Aucune.</p>`}</div>
    </div>
    <div class="panel__foot">${actions}</div>`);
}

/* ----- Réservation ----- */
function openReservation(id) {
  reopen = () => openReservation(id);
  const r = resById(id), v = byId(r.vehicleId), c = custById(r.customerId);
  let actions = "";
  if (r.status === "demande") actions = `<button class="btn btn--primary" data-action="review" data-id="${r.id}">Examiner la demande</button>`;
  if (r.status === "confirmee") actions = `<button class="btn btn--ghost" data-action="cancel-res" data-id="${r.id}">Annuler la réservation</button>${r.start <= 0 ? `<button class="btn btn--primary" data-action="checkout" data-id="${r.id}">Remettre les clés</button>` : ""}`;
  if (r.status === "en_cours") actions = `<button class="btn btn--primary" data-action="checkin" data-id="${r.id}">Clôturer le retour</button>`;
  openPanel("drawer", `
    ${panelHead(`Réservation ${esc(r.id)}`, esc(r.client))}
    <div class="panel__body">
      <div class="row-actions">${rPill(r)}${plate(v.plate)}</div>
      ${r.reason ? `<div class="callout" style="--c:var(--late)">Motif du refus : <strong>${esc(r.reason)}</strong></div>` : ""}
      <dl class="facts">
        <div><dt>Client</dt><dd><button class="link-btn" style="color:var(--fg)" data-action="open-customer" data-id="${c.id}">${esc(c.name)}</button></dd></div>
        <div><dt>Véhicule</dt><dd><button class="link-btn" style="color:var(--fg)" data-action="open-vehicle" data-id="${v.id}">${esc(v.model)}</button></dd></div>
        <div><dt>Départ</dt><dd>${fmtDate(r.start)} · ${r.tStart}</dd></div>
        <div><dt>Retour</dt><dd style="${isLate(r) ? "color:var(--late)" : ""}">${fmtDate(r.end)} · ${r.tEnd}</dd></div>
        <div><dt>Agence</dt><dd>${agencyName(v.agency)}</dd></div>
        <div><dt>Durée</dt><dd>${nights(r)} jour${nights(r) > 1 ? "s" : ""}</dd></div>
        <div><dt>Montant</dt><dd>${money.format(r.price)}</dd></div>
        <div><dt>Km inclus</dt><dd>${fmtKm(nights(r) * KM_INCLUDED_PER_DAY)}</dd></div>
        ${r.kmStart != null ? `<div><dt>Compteur au départ</dt><dd>${fmtKm(r.kmStart)}</dd></div>` : ""}
        ${r.kmEnd != null ? `<div><dt>Compteur au retour</dt><dd>${fmtKm(r.kmEnd)}</dd></div>` : ""}
        ${r.extras ? `<div><dt>Suppléments</dt><dd>${money2.format(r.extras)}</dd></div>` : ""}
      </dl>
      <div><div class="sub-title">Documents du client</div>${miniDocs(c)}</div>
      ${r.photosOut.length ? `<div><div class="sub-title">Photos au départ</div>${thumbGrid(r.photosOut)}</div>` : ""}
      ${r.photosIn.length ? `<div><div class="sub-title">Photos au retour</div>${thumbGrid(r.photosIn)}</div>` : ""}
    </div>
    ${actions ? `<div class="panel__foot">${actions}</div>` : ""}`);
}

/* ----- Client (vue agence) ----- */
function openCustomer(id) {
  reopen = () => openCustomer(id);
  const c = custById(id);
  const res = state.reservations.filter((r) => r.customerId === c.id).sort((a, b) => b.start - a.start);
  openPanel("drawer", `
    ${panelHead(esc(c.name), esc(c.email))}
    <div class="panel__body">
      <dl class="facts">
        <div><dt>Client depuis</dt><dd>${fmtDate(c.since, { month: "long", year: "numeric" })}</dd></div>
        <div><dt>Locations</dt><dd>${res.filter((r) => ["terminee", "en_cours", "confirmee"].includes(r.status)).length}</dd></div>
      </dl>
      <div><div class="sub-title">Documents</div>${docReview(c)}</div>
      <div><div class="sub-title">Réservations</div>${res.length ? `<ul class="hist">${res.map((r) => `<li><button class="link-btn" style="color:var(--fg)" data-action="${r.status === "demande" ? "review" : "open-res"}" data-id="${r.id}">${esc(byId(r.vehicleId).model)}</button><span class="num">${fmtShort(r.start)} → ${fmtShort(r.end)}</span>${rPill(r)}</li>`).join("")}</ul>` : `<p class="muted">Aucune.</p>`}</div>
    </div>`);
}

/* ----- Examen d'une demande : documents + décision ----- */
function refuseBlock(defaultReason) {
  return `<div class="callout" style="--c:var(--late)">
    <div class="form" style="grid-template-columns:minmax(0,1fr)">
      <label>Motif du refus (visible par le client)<select class="select" id="res-reason">${RES_REASONS.map((r) => `<option ${r === defaultReason ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      <label>Précision (facultatif)<textarea class="input" id="res-comment" rows="2" placeholder="Ex. : permis expiré depuis mars, merci d'envoyer le nouveau titre."></textarea></label>
    </div>
  </div>`;
}
function openReview(id) {
  reopen = () => openReview(id);
  const r = resById(id), v = byId(r.vehicleId), c = custById(r.customerId);
  const conflict = hasConflict(v.id, r.start, r.end, r.id);
  const valid = docsValid(c);
  const anyRefused = docsList(c).some((d) => d.status === "refuse");
  const isPermisRefused = c.docs.permis.status === "refuse" && /expir/i.test(c.docs.permis.reason);
  const defaultReason = isPermisRefused ? "Permis expiré ou invalide" : anyRefused ? "Documents non conformes" : conflict ? "Véhicule plus disponible sur ces dates" : RES_REASONS[0];
  const foot = ui.refusingRes
    ? `<button class="btn btn--ghost" data-action="refuse-res-cancel">Retour</button><button class="btn btn--ko" data-action="refuse-res-confirm" data-id="${r.id}">Confirmer le refus</button>`
    : `<span class="hint">${valid ? (conflict ? "Le véhicule n'est plus libre sur ces dates." : "Les 3 documents sont conformes.") : "Marquez les 3 documents conformes pour accepter."}</span>
       <button class="btn btn--ko" data-action="refuse-res-start">Refuser la demande</button>
       <button class="btn btn--primary" data-action="accept-res" data-id="${r.id}" ${valid && !conflict ? "" : "disabled"}>Accepter la réservation</button>`;
  openPanel("modal modal--wide", `
    ${panelHead(`Demande ${esc(r.id)}`, `Envoyée ${fmtRel(r.requestedDay)} par ${esc(c.name)} · ${esc(c.email)}`)}
    <div class="panel__body">
      ${ui.refusingRes ? refuseBlock(defaultReason) : ""}
      <div class="review">
        <div><div class="sub-title">Documents du client</div>${docReview(c)}</div>
        <div class="review__side">
          <img src="${photoOf(v)}" alt="${esc(v.model)}">
          <dl class="facts">
            <div><dt>Véhicule</dt><dd>${esc(v.model)}</dd></div>
            <div><dt>Immatriculation</dt><dd>${plate(v.plate)}</dd></div>
            <div><dt>Départ</dt><dd>${fmtDate(r.start)} · ${r.tStart}</dd></div>
            <div><dt>Retour</dt><dd>${fmtDate(r.end)} · ${r.tEnd}</dd></div>
            <div><dt>Agence</dt><dd>${agencyName(v.agency)}</dd></div>
            <div><dt>Montant</dt><dd>${money.format(r.price)} (${nights(r)} j)</dd></div>
          </dl>
          ${conflict ? `<div class="callout" style="--c:var(--late)">Ce véhicule a déjà une réservation sur ces dates.</div>` : ""}
        </div>
      </div>
    </div>
    <div class="panel__foot">${foot}</div>`);
}

/* ----- Nouvelle réservation (agence) ----- */
let draft = null;
function openNewReservation(vehicleId, day) {
  reopen = null;
  const v = vehicleId ? byId(vehicleId) : null;
  const start = Math.max(0, day ?? 1);
  draft = { vehicleId: vehicleId || null };
  openPanel("modal", `
    ${panelHead("Nouvelle réservation", "Réservation saisie en agence : elle est confirmée directement.")}
    <form class="panel__body" id="new-res-form" novalidate>
      <div class="form">
        <label class="full">Client<input class="input" id="nr-client" list="nr-clients" autocomplete="off" placeholder="Nom d'un client existant ou nouveau client" data-autofocus>
          <datalist id="nr-clients">${state.customers.map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist></label>
        <label>Départ<input class="input" type="date" id="nr-start" value="${isoOf(start)}" min="${isoOf(0)}"></label>
        <label>Retour<input class="input" type="date" id="nr-end" value="${isoOf(start + 3)}" min="${isoOf(0)}"></label>
        <label>Agence<select class="select" id="nr-agency">${Object.entries(AGENCIES).map(([k, a]) => `<option value="${k}" ${(v ? v.agency : ui.agency === "all" ? "PAR" : ui.agency) === k ? "selected" : ""}>${a.name}</option>`).join("")}</select></label>
        <label>Catégorie<select class="select" id="nr-cat"><option value="all">Toutes</option>${CATEGORIES.map((c) => `<option ${v && v.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      </div>
      <div><div class="sub-title" id="nr-count">Véhicules disponibles</div><div class="pick" id="nr-list"></div></div>
      <p class="form-error" id="nr-error" role="alert"></p>
    </form>
    <div class="panel__foot"><button class="btn btn--ghost" data-action="close">Annuler</button><button class="btn btn--primary" data-action="submit-res">Confirmer la réservation</button></div>`);
  refreshPicker();
}
function refreshPicker() {
  const start = offOf(document.getElementById("nr-start").value);
  const end = offOf(document.getElementById("nr-end").value);
  const agency = document.getElementById("nr-agency").value;
  const cat = document.getElementById("nr-cat").value;
  const list = document.getElementById("nr-list");
  const count = document.getElementById("nr-count");
  if (isNaN(start) || isNaN(end) || end <= start) {
    count.textContent = "Véhicules disponibles";
    list.innerHTML = `<p class="muted">Choisissez une date de retour après la date de départ.</p>`;
    return;
  }
  const days = end - start;
  const free = availableVehicles(agency, cat, start, end);
  if (draft.vehicleId && !free.some((v) => v.id === draft.vehicleId)) draft.vehicleId = null;
  count.textContent = `${free.length} véhicule${free.length > 1 ? "s" : ""} disponible${free.length > 1 ? "s" : ""} · ${days} jour${days > 1 ? "s" : ""}`;
  list.innerHTML = free.length ? free.map((v) => `
    <label>
      <input type="radio" name="nr-vehicle" value="${v.id}" ${draft.vehicleId === v.id ? "checked" : ""}>
      ${plate(v.plate)}
      <span style="min-width:0"><strong>${esc(v.model)}</strong><small>${v.cat} · ${fmtKm(v.km)} · ${fuelLabel(v).toLowerCase()} ${v.fuel} %</small></span>
      <span class="price">${money.format(v.price * days)}</span>
    </label>`).join("") : `<p class="muted">Aucun véhicule libre sur cette période dans cette agence. Essayez une autre catégorie ou d'autres dates.</p>`;
}
function submitReservation() {
  const err = document.getElementById("nr-error");
  const name = document.getElementById("nr-client").value.trim().replace(/\s+/g, " ");
  const start = offOf(document.getElementById("nr-start").value);
  const end = offOf(document.getElementById("nr-end").value);
  const picked = document.querySelector("input[name=nr-vehicle]:checked");
  if (!name) { err.textContent = "Indiquez le nom du client."; document.getElementById("nr-client").focus(); return; }
  if (isNaN(start) || start < 0) { err.textContent = "La date de départ doit être aujourd'hui ou plus tard."; return; }
  if (isNaN(end) || end <= start) { err.textContent = "La date de retour doit être après la date de départ."; return; }
  if (!picked) { err.textContent = "Choisissez un véhicule dans la liste."; return; }
  const v = byId(picked.value);
  act("reservations", { vehicleId: v.id, start: isoOf(start), end: isoOf(end), customerName: name }, {
    message: (res) => `Réservation ${res.code} confirmée : ${v.model} pour ${name}.${res.docsValid ? "" : " Documents à vérifier avant la remise des clés."}`,
  });
}

/* ----- Remise des clés ----- */
function openCheckout(id, fresh = true) {
  reopen = () => openCheckout(id, false);
  if (fresh) ui.pendingPhotos = [];
  const r = resById(id), v = byId(r.vehicleId), c = custById(r.customerId);
  const valid = docsValid(c);
  const foot = ui.refusingRes
    ? `<button class="btn btn--ghost" data-action="refuse-res-cancel">Retour</button><button class="btn btn--ko" data-action="refuse-res-confirm" data-id="${r.id}">Confirmer le refus</button>`
    : `<button class="btn btn--ko" data-action="refuse-res-start">Refuser la location</button><button class="btn btn--primary" data-action="confirm-checkout" data-id="${r.id}" ${valid ? "" : "disabled"}>Valider le départ</button>`;
  openPanel("modal modal--wide", `
    ${panelHead("Remise des clés", `${esc(r.client)} · ${esc(v.model)} · ${esc(v.plate)}`)}
    <div class="panel__body">
      ${ui.refusingRes ? refuseBlock("Documents non conformes") : ""}
      <div class="review">
        <div>
          <div class="sub-title">Documents du client</div>
          ${valid ? `<div class="callout" style="--c:var(--ok);margin-bottom:12px">Les 3 documents sont conformes. Vérifiez les originaux au comptoir.</div>` : `<div class="callout" style="--c:var(--late);margin-bottom:12px">Documents incomplets ou non conformes : la remise des clés est bloquée tant qu'ils ne sont pas validés.</div>`}
          ${docReview(c)}
        </div>
        <div class="review__side">
          <dl class="facts">
            <div><dt>Compteur au départ</dt><dd>${fmtKm(v.km)}</dd></div>
            <div><dt>${fuelLabel(v)}</dt><dd>${v.fuel} %</dd></div>
            <div><dt>Retour prévu</dt><dd>${fmtDate(r.end)} · ${r.tEnd}</dd></div>
            <div><dt>Km inclus</dt><dd>${fmtKm(nights(r) * KM_INCLUDED_PER_DAY)}</dd></div>
          </dl>
          ${v.fuel < 25 ? `<div class="callout" style="--c:var(--maint)">${v.cat === "Électrique" ? "Batterie basse : rechargez" : "Réservoir bas : faites le plein"} avant le départ.</div>` : ""}
          <div class="form" style="grid-template-columns:minmax(0,1fr)">
            <label class="check"><input type="checkbox" id="co-check" ${valid ? "" : "disabled"}> État des lieux de départ fait avec le client</label>
            <label class="check"><input type="checkbox" id="co-deposit" ${valid ? "" : "disabled"}> Caution de ${money.format(DEPOSIT)} enregistrée</label>
          </div>
          ${photoInput("co-photos", "Photos de l'état des lieux (facultatif)")}
          <p class="form-error" id="co-error" role="alert"></p>
        </div>
      </div>
    </div>
    <div class="panel__foot">${foot}</div>`);
}
function confirmCheckout(id) {
  if (!document.getElementById("co-check").checked || !document.getElementById("co-deposit").checked) {
    document.getElementById("co-error").textContent = "Cochez l'état des lieux et la caution avant de remettre les clés.";
    return;
  }
  const r = resById(id), v = byId(r.vehicleId);
  act(`reservations/${id}/checkout`, { photos: ui.pendingPhotos.slice() }, {
    message: `${v.model} remise à ${r.client}. Retour attendu ${fmtRel(r.end)}.`,
  });
}

/* ----- Retour du véhicule ----- */
function openCheckin(id, fresh = true) {
  reopen = () => openCheckin(id, false);
  if (fresh) ui.pendingPhotos = [];
  const r = resById(id), v = byId(r.vehicleId);
  const days = Math.max(1, effectiveEnd(r) - r.start);
  const suggestedKm = r.kmStart + Math.round(days * 190);
  openPanel("modal", `
    ${panelHead("Retour du véhicule", `${esc(r.client)} · ${esc(v.model)}`)}
    <div class="panel__body">
      ${isLate(r) ? `<div class="callout" style="--c:var(--late)">Retour prévu ${fmtRel(r.end)} : ${-r.end} jour${-r.end > 1 ? "s" : ""} de retard facturé${-r.end > 1 ? "s" : ""} à 150 % du tarif.</div>` : ""}
      <div class="form">
        <label>Compteur au retour (km)<input class="input num" type="number" id="ci-km" min="${r.kmStart}" step="1" value="${suggestedKm}" data-rid="${r.id}"></label>
        <label>${fuelLabel(v)} au retour : <span id="ci-fuel-label">${r.fuelStart} %</span><input type="range" id="ci-fuel" min="0" max="100" step="5" value="${r.fuelStart}" data-rid="${r.id}"></label>
        <label class="check full"><input type="checkbox" id="ci-check"> État des lieux de retour fait, aucun dommage constaté</label>
      </div>
      ${photoInput("ci-photos", "Photos de l'état des lieux de retour (facultatif)")}
      <div class="bill" id="ci-bill"></div>
      <p class="form-error" id="ci-error" role="alert"></p>
    </div>
    <div class="panel__foot"><button class="btn btn--ghost" data-action="close">Annuler</button><button class="btn btn--primary" data-action="confirm-checkin" data-id="${r.id}">Clôturer et facturer</button></div>`);
  refreshBill(id);
}
function refreshBill(id) {
  const r = resById(id);
  const km = Number(document.getElementById("ci-km").value);
  const fuel = Number(document.getElementById("ci-fuel").value);
  document.getElementById("ci-fuel-label").textContent = fuel + " %";
  const c = computeReturn(r, km, fuel);
  document.getElementById("ci-bill").innerHTML = `
    <div><span>Location</span><b>${money2.format(r.price)}</b></div>
    <div><span>Parcouru ${fmtKm(c.driven)} sur ${fmtKm(c.included)} inclus</span><b>${c.extraKm ? money2.format(c.extraFee) : "—"}</b></div>
    <div><span>${c.electric ? "Recharge" : "Carburant"} manquant</span><b>${c.energyFee ? money2.format(c.energyFee) : "—"}</b></div>
    ${c.lateDays ? `<div><span>Retard (${c.lateDays} j)</span><b>${money2.format(c.lateFee)}</b></div>` : ""}
    <div class="total"><span>Total à facturer</span><b>${money2.format(c.total)}</b></div>`;
}
function confirmCheckin(id) {
  const r = resById(id), v = byId(r.vehicleId);
  const km = Number(document.getElementById("ci-km").value);
  const fuel = Number(document.getElementById("ci-fuel").value);
  const err = document.getElementById("ci-error");
  if (!km || km < r.kmStart) { err.textContent = `Le compteur doit être d'au moins ${fmtKm(r.kmStart)} (relevé au départ).`; return; }
  if (!document.getElementById("ci-check").checked) { err.textContent = "Confirmez l'état des lieux de retour."; return; }
  act(`reservations/${id}/checkin`, { km, fuel, photos: ui.pendingPhotos.slice() }, {
    message: (res) => `Retour clôturé : ${money2.format(res.bill.total)} facturés.${maintenanceInfo(byId(v.id)).service !== "ok" ? " Révision à prévoir pour ce véhicule." : ""}`,
  });
}

/* ----- Demande côté client ----- */
function openClientRequest(vid) {
  reopen = null;
  const v = byId(vid), c = me(), s = ui.search;
  const days = s.end - s.start;
  const ready = docsSent(c);
  openPanel("modal", `
    ${panelHead("Demande de réservation", `${esc(v.model)} · ${agencyName(v.agency)}`)}
    <div class="panel__body">
      <img src="${photoOf(v)}" alt="${esc(v.model)}" style="display:block;width:100%;aspect-ratio:5/3;object-fit:cover;border-radius:6px">
      <dl class="facts">
        <div><dt>Départ</dt><dd>${fmtDate(s.start)} · 10:00</dd></div>
        <div><dt>Retour</dt><dd>${fmtDate(s.end)} · 18:00</dd></div>
        <div><dt>Durée</dt><dd>${days} jour${days > 1 ? "s" : ""}</dd></div>
        <div><dt>Prix</dt><dd>${money.format(v.price * days)}</dd></div>
        <div><dt>Km inclus</dt><dd>${fmtKm(days * KM_INCLUDED_PER_DAY)}</dd></div>
        <div><dt>Caution</dt><dd>${money.format(DEPOSIT)} au départ</dd></div>
      </dl>
      ${ready ? `<div class="callout">L'agence vérifie vos documents puis confirme la réservation. Vous suivez l'avancement dans « Ma location ».</div>`
        : `<div class="callout" style="--c:var(--late)">Vos documents sont incomplets ou refusés. Envoyez-les avant de faire une demande.</div>`}
    </div>
    <div class="panel__foot">
      <button class="btn btn--ghost" data-action="close">Annuler</button>
      ${ready ? `<button class="btn btn--primary" data-action="client-send" data-vid="${v.id}">Envoyer la demande</button>` : `<button class="btn btn--primary" data-action="nav" data-view="mes-documents">Compléter mes documents</button>`}
    </div>`);
}
async function sendClientRequest(vid) {
  const s = ui.search;
  const res = await act("reservations", { vehicleId: vid, start: isoOf(s.start), end: isoOf(s.end) }, {
    message: (r) => `Demande ${r.code} envoyée. L'agence vérifie vos documents et vous répond sous 24 h.`,
  });
  if (res) go("ma-location");
}

/* ----- Confirmation générique ----- */
function openConfirm(title, text, yesLabel, onYes) {
  reopen = null;
  ui.onConfirm = onYes;
  openPanel("modal", `${panelHead(title, text)}<div class="panel__foot"><button class="btn btn--ghost" data-action="close">Non, revenir</button><button class="btn btn--primary" data-action="confirm-yes" data-autofocus>${yesLabel}</button></div>`);
}
