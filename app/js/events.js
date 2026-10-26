/* =========================================================
   Notifications et compte à rebours
   ========================================================= */
let toastTimer;
function toast(text) {
  const slot = document.getElementById("toast-slot");
  slot.innerHTML = `<div class="toast">${esc(text)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { slot.innerHTML = ""; }, 4500);
}
function tick() {
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    const target = Number(el.dataset.target), start = Number(el.dataset.start), now = Date.now();
    const diff = target - now, late = diff < 0;
    let rest = Math.floor(Math.abs(diff) / 1000);
    const parts = { d: Math.floor(rest / 86400), h: Math.floor((rest % 86400) / 3600), m: Math.floor((rest % 3600) / 60), s: rest % 60 };
    Object.entries(parts).forEach(([k, val]) => { const b = el.querySelector(`[data-unit="${k}"]`); if (b) b.textContent = String(val).padStart(2, "0"); });
    el.classList.toggle("is-late", late);
    el.querySelector("[data-cd-label]").textContent = late ? "En retard depuis" : el.dataset.label;
    const bar = el.querySelector("[data-progress]");
    if (bar) bar.style.width = Math.max(0, Math.min(100, ((now - start) / (target - start)) * 100)) + "%";
  });
}
setInterval(tick, 1000);

/* =========================================================
   Événements (délégation : un seul écouteur par type)
   ========================================================= */
function setHash(view) { try { history.replaceState(null, "", view ? "#" + view : location.pathname); } catch (e) {} }
function go(view) {
  ui.view = view;
  setHash(view);
  closePanel();
  render();
  const el = document.getElementById("view");
  if (el) el.scrollTop = 0;
}

document.addEventListener("click", (e) => {
  const track = e.target.closest(".g-track");
  if (track && !e.target.closest(".g-bar")) {
    const rect = track.getBoundingClientRect();
    const day = ui.planStart + Math.floor(((e.clientX - rect.left) / rect.width) * 14);
    const v = byId(track.dataset.vid);
    if (v.state !== "ok") { toast(`${v.model} est immobilisé : remettez-le en service pour le réserver.`); return; }
    if (day < 0) { toast("Choisissez une date à partir d'aujourd'hui."); return; }
    openNewReservation(v.id, day);
    return;
  }

  const t = e.target.closest("[data-action]");
  if (!t || t.disabled) return;
  const { action, id } = t.dataset;
  const v = id ? byId(id) : null;
  const doc = t.dataset.cid ? custById(t.dataset.cid).docs[t.dataset.type] : null;

  switch (action) {
    // Session
    case "auth-mode": ui.authMode = t.dataset.mode; render(); break;
    case "demo-login": login(t.dataset.role, t.dataset.cid); break;
    case "logout": session = null; saveSession(); ui.authMode = "login"; closePanel(); setHash(""); render(); break;

    // Navigation et panneaux
    case "nav": go(t.dataset.view); break;
    case "close": closePanel(); break;
    case "lightbox": { const img = t.querySelector("img"); if (img) openLightbox(img.src, img.alt || "Photo"); break; }
    case "lightbox-back": if (reopen) reopen(); break;
    case "view-doc": { const c = custById(t.dataset.cid); openLightbox(docSrc(c, t.dataset.type), `${DOC_TYPES[t.dataset.type].label} · ${c.name}`); break; }
    case "open-vehicle": openVehicle(id); break;
    case "open-res": openReservation(id); break;
    case "open-customer": ui.docRefuse = null; openCustomer(id); break;
    case "review": ui.docRefuse = null; ui.refusingRes = false; openReview(id); break;

    // Documents
    case "doc-ok": Object.assign(doc, { status: "valide", reason: "" }); save(); refresh(); break;
    case "doc-counter": Object.assign(doc, { status: "valide", reason: "", counter: true, day: 0 }); save(); refresh(); break;
    case "doc-ko": ui.docRefuse = `${t.dataset.cid}:${t.dataset.type}`; refresh(); break;
    case "doc-ko-cancel": ui.docRefuse = null; refresh(); break;
    case "doc-ko-confirm":
      Object.assign(doc, { status: "refuse", reason: document.getElementById("doc-reason").value });
      ui.docRefuse = null; save(); refresh();
      toast(`${DOC_TYPES[t.dataset.type].label} refusé. Le client voit le motif dans son espace.`);
      break;

    // Décision sur une demande ou au comptoir
    case "accept-res": {
      const r = resById(id);
      r.status = "confirmee";
      save(); closePanel(); render();
      toast(`Réservation ${r.id} acceptée. ${r.client} la voit confirmée dans son espace.`);
      break;
    }
    case "refuse-res-start": ui.refusingRes = true; ui.docRefuse = null; if (reopen) reopen(); break;
    case "refuse-res-cancel": ui.refusingRes = false; if (reopen) reopen(); break;
    case "refuse-res-confirm": {
      const r = resById(id);
      const comment = document.getElementById("res-comment").value.trim();
      r.status = "refusee";
      r.reason = document.getElementById("res-reason").value + (comment ? ` (${comment})` : "");
      save(); closePanel(); render();
      toast(`Demande ${r.id} refusée. ${r.client} voit le motif dans son espace.`);
      break;
    }

    // Réservations
    case "new-res": openNewReservation(t.dataset.vid); break;
    case "submit-res": submitReservation(); break;
    case "checkout": ui.refusingRes = false; ui.docRefuse = null; openCheckout(id); break;
    case "confirm-checkout": confirmCheckout(id); break;
    case "checkin": openCheckin(id); break;
    case "confirm-checkin": confirmCheckin(id); break;
    case "pending-del": ui.pendingPhotos.splice(Number(t.dataset.idx), 1); document.getElementById("pending-thumbs").innerHTML = pendingThumbs(); break;
    case "cancel-res": {
      const r = resById(id); r.status = "annulee";
      save(); closePanel(); render(); toast(`Réservation ${r.id} annulée. Le véhicule est de nouveau libre sur ces dates.`);
      break;
    }

    // Flotte
    case "fleet-filter": ui.fleet.status = t.dataset.status; if (ui.view !== "flotte") go("flotte"); else render(); break;
    case "plan-shift": ui.planStart += Number(t.dataset.step); render(); break;
    case "plan-today": ui.planStart = -3; render(); break;
    case "photo-del": {
      const veh = byId(t.dataset.vid);
      veh.photos.splice(Number(t.dataset.idx), 1);
      save(); refresh();
      break;
    }
    case "photo-main": {
      const veh = byId(t.dataset.vid);
      const [p] = veh.photos.splice(Number(t.dataset.idx), 1);
      veh.photos.unshift(p);
      save(); refresh();
      break;
    }
    case "send-maint": {
      const clash = state.reservations.filter((r) => r.vehicleId === v.id && r.status === "confirmee" && r.start <= 2);
      v.state = "entretien"; v.note = "Révision programmée";
      save(); closePanel(); render();
      toast(clash.length ? `${v.model} part en entretien. Attention : ${clash.length} réservation(s) à réaffecter dans les 2 jours.` : `${v.model} part en entretien.`);
      break;
    }
    case "maint-done": {
      const m = maintenanceInfo(v);
      if (m.service !== "ok" || v.state === "entretien") v.nextServiceKm = Math.ceil((v.km + 15000) / 1000) * 1000;
      if (m.ct !== "ok") v.ctDays = 730;
      v.state = "ok"; v.note = "";
      save(); closePanel(); render(); toast(`${v.model} est de nouveau disponible. Prochaine révision à ${fmtKm(v.nextServiceKm)}.`);
      break;
    }
    case "set-hs": v.state = "hs"; v.note = "Déclaré hors service depuis la console"; save(); closePanel(); render(); toast(`${v.model} est hors service.`); break;
    case "restore": v.state = "ok"; v.note = ""; save(); closePanel(); render(); toast(`${v.model} est remis en service.`); break;

    // Espace client
    case "client-pick": openClientRequest(t.dataset.vid); break;
    case "client-send": sendClientRequest(t.dataset.vid); break;
    case "client-cancel": {
      const r = resById(id);
      openConfirm("Annuler cette réservation ?", `${byId(r.vehicleId).model}, ${fmtShort(r.start)} → ${fmtShort(r.end)}`, "Oui, annuler", () => {
        r.status = "annulee"; save(); closePanel(); render(); toast(`Réservation ${r.id} annulée.`);
      });
      break;
    }

    // Démo
    case "ask-reset":
      openConfirm("Réinitialiser la démo ?", "Les réservations, documents et photos ajoutés dans ce navigateur seront remplacés par les données d'exemple.", "Réinitialiser", () => {
        state = seed(); artCache.clear(); save(); closePanel(); render(); toast("Démo réinitialisée avec les données d'exemple.");
      });
      break;
    case "confirm-yes": if (ui.onConfirm) ui.onConfirm(); break;
  }
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "login-form") doLogin();
  if (e.target.id === "signup-form") doSignup();
  if (e.target.id === "new-res-form") submitReservation();
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "fleet-q") { ui.fleet.q = el.value; document.getElementById("fleet-grid").innerHTML = fleetCards(); }
  if (el.id === "ci-km" || el.id === "ci-fuel") refreshBill(el.dataset.rid);
});

document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.id === "agency-switch") { ui.agency = el.value; render(); return; }
  if (el.id === "fleet-cat") { ui.fleet.cat = el.value; document.getElementById("fleet-grid").innerHTML = fleetCards(); return; }
  if (["nr-start", "nr-end", "nr-agency", "nr-cat"].includes(el.id)) { refreshPicker(); return; }
  if (el.name === "nr-vehicle") { draft.vehicleId = el.value; return; }

  // Recherche côté client
  if (el.id === "cr-agency") ui.search.agency = el.value;
  if (el.id === "cr-cat") ui.search.cat = el.value;
  if (el.id === "cr-start" && el.value) { ui.search.start = Math.max(0, offOf(el.value)); if (ui.search.end <= ui.search.start) ui.search.end = ui.search.start + 1; }
  if (el.id === "cr-end" && el.value) ui.search.end = offOf(el.value);
  if (el.id && el.id.startsWith("cr-")) { render(); return; }

  // Photos et documents
  if (el.type !== "file" || !el.files.length) return;
  const images = await readImages(el.files);
  el.value = "";
  if (!images.length) return;

  if (el.dataset.vehiclePhotos) {
    const veh = byId(el.dataset.vehiclePhotos);
    veh.photos.push(...images);
    if (!saveOrUndo(() => veh.photos.splice(-images.length))) { refresh(); return; }
    refresh();
    toast(`${images.length} photo${images.length > 1 ? "s" : ""} ajoutée${images.length > 1 ? "s" : ""} à ${veh.model}.`);
  } else if (el.id === "co-photos" || el.id === "ci-photos") {
    ui.pendingPhotos.push(...images);
    document.getElementById("pending-thumbs").innerHTML = pendingThumbs();
  } else if (el.dataset.docUpload) {
    const c = me(), type = el.dataset.docUpload;
    const before = { ...c.docs[type] };
    c.docs[type] = { status: "en_attente", file: images[0], specimen: false, day: 0, reason: "" };
    if (!saveOrUndo(() => { c.docs[type] = before; })) { render(); return; }
    render();
    toast(`${DOC_TYPES[type].label} envoyé. L'agence le vérifie sous 24 h.`);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && layer.innerHTML) closePanel();
});

render();
