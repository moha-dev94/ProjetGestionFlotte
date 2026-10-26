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
   Chaque action qui modifie des données appelle l'API via act(),
   puis recharge les données depuis la base.
   ========================================================= */
function setHash(view) { try { history.replaceState(null, "", view ? "#" + view : location.pathname); } catch (e) {} }
function go(view) {
  // Quitter la personnalisation sans enregistrer annule l'aperçu
  if (ui.brandDraft && view !== "personnalisation") { ui.brandDraft = null; applyBrand(brand); }
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
  const docRoute = t.dataset.cid ? `customers/${t.dataset.cid}/documents/${t.dataset.type}` : null;

  switch (action) {
    // Session
    case "auth-mode": ui.authMode = t.dataset.mode; render(); break;
    case "demo-login": signIn(t.dataset.email, DEMO_PASSWORD); break;
    case "logout": logout(); break;

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

    // Documents (vérification par l'agence)
    case "doc-ok": act(docRoute, { action: "valide" }, { keepPanel: true }); break;
    case "doc-counter": act(docRoute, { action: "counter" }, { keepPanel: true }); break;
    case "doc-ko": ui.docRefuse = `${t.dataset.cid}:${t.dataset.type}`; refresh(); break;
    case "doc-ko-cancel": ui.docRefuse = null; refresh(); break;
    case "doc-ko-confirm":
      ui.docRefuse = null;
      act(docRoute, { action: "refuse", reason: document.getElementById("doc-reason").value }, {
        keepPanel: true, message: `${DOC_TYPES[t.dataset.type].label} refusé. Le client voit le motif dans son espace.`,
      });
      break;

    // Décision sur une demande ou au comptoir
    case "accept-res": {
      const r = resById(id);
      act(`reservations/${id}/accept`, {}, { message: `Réservation ${id} acceptée. ${r.client} la voit confirmée dans son espace.` });
      break;
    }
    case "refuse-res-start": ui.refusingRes = true; ui.docRefuse = null; if (reopen) reopen(); break;
    case "refuse-res-cancel": ui.refusingRes = false; if (reopen) reopen(); break;
    case "refuse-res-confirm": {
      const r = resById(id);
      const comment = document.getElementById("res-comment").value.trim();
      const reason = document.getElementById("res-reason").value + (comment ? ` (${comment})` : "");
      act(`reservations/${id}/refuse`, { reason }, { message: `Demande ${id} refusée. ${r.client} voit le motif dans son espace.` });
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
    case "cancel-res": act(`reservations/${id}/cancel`, {}, { message: `Réservation ${id} annulée. Le véhicule est de nouveau libre sur ces dates.` }); break;

    // Flotte
    case "fleet-filter": ui.fleet.status = t.dataset.status; if (ui.view !== "flotte") go("flotte"); else render(); break;
    case "plan-shift": ui.planStart += Number(t.dataset.step); render(); break;
    case "plan-today": ui.planStart = -3; render(); break;
    case "photo-del": act(`vehicles/${t.dataset.vid}/photos/${t.dataset.pid}/delete`, {}, { keepPanel: true, message: "Photo supprimée." }); break;
    case "photo-main": act(`vehicles/${t.dataset.vid}/photos/${t.dataset.pid}/main`, {}, { keepPanel: true, message: "Photo principale mise à jour." }); break;
    case "send-maint":
      act(`vehicles/${id}/state`, { action: "entretien" }, {
        message: (res) => res.clash ? `${v.model} part en entretien. Attention : ${res.clash} réservation(s) à réaffecter dans les 2 jours.` : `${v.model} part en entretien.`,
      });
      break;
    case "maint-done":
      act(`vehicles/${id}/state`, { action: "maintenance_done" }, { message: () => `${v.model} est de nouveau disponible. Prochaine révision à ${fmtKm(byId(id).nextServiceKm)}.` });
      break;
    case "set-hs": act(`vehicles/${id}/state`, { action: "hs" }, { message: `${v.model} est hors service.` }); break;
    case "restore": act(`vehicles/${id}/state`, { action: "ok" }, { message: `${v.model} est remis en service.` }); break;

    // Espace client
    case "client-pick": openClientRequest(t.dataset.vid); break;
    case "client-send": sendClientRequest(t.dataset.vid); break;
    case "client-cancel": {
      const r = resById(id);
      openConfirm("Annuler cette réservation ?", `${byId(r.vehicleId).model}, ${fmtShort(r.start)} → ${fmtShort(r.end)}`, "Oui, annuler", () =>
        act(`reservations/${id}/cancel`, {}, { message: `Réservation ${id} annulée.` }));
      break;
    }

    // Personnalisation de la marque
    case "brand-preset": applyBrandPreset(t.dataset.preset); break;
    case "brand-save": saveBrandDraft(); break;
    case "brand-cancel": cancelBrandDraft(); break;
    case "brand-default": resetBrandDraft(); break;
    case "brand-logo-remove": removeBrandLogo(); break;

    // Démo
    case "ask-reset":
      openConfirm("Réinitialiser la démo ?", "Les réservations, documents et photos de la base sont remplacés par les données d'exemple. La marque et le logo sont conservés.", "Réinitialiser", () =>
        act("reset", {}, { message: "Démo réinitialisée avec les données d'exemple." }));
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
  if (el.dataset.brandField) updateBrandDraft(el.dataset.brandField, el.value);
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

  // Photos, documents et logo : compressés dans le navigateur puis envoyés à l'API
  if (el.type !== "file" || !el.files.length) return;
  if (el.id === "brand-logo") { await setBrandLogo(el.files[0]); el.value = ""; return; }
  const images = await readImages(el.files);
  el.value = "";
  if (!images.length) return;

  if (el.dataset.vehiclePhotos) {
    const n = images.length;
    act(`vehicles/${el.dataset.vehiclePhotos}/photos`, { images }, { keepPanel: true, message: `${n} photo${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""}.` });
  } else if (el.id === "co-photos" || el.id === "ci-photos") {
    ui.pendingPhotos.push(...images);
    document.getElementById("pending-thumbs").innerHTML = pendingThumbs();
  } else if (el.dataset.docUpload) {
    const type = el.dataset.docUpload;
    act(`documents/${type}`, { image: images[0] }, { message: `${DOC_TYPES[type].label} envoyé. L'agence le vérifie sous 24 h.` });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && layer.innerHTML) closePanel();
});

/* =========================================================
   Démarrage : marque, session en cours, puis premier affichage
   ========================================================= */
async function boot() {
  try {
    setBrand((await api("brand")).brand);
    const { user } = await api("me");
    if (user) { setSession(user); await reload(); }
  } catch (e) {
    serverError = e.message;
  }
  render();
}
boot();
