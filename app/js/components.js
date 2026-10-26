/* =========================================================
   Composants partagés : documents et photos
   ========================================================= */
/* Vérification des documents par l'agence (conforme / non conforme avec motif). */
function docReview(c) {
  return `<div class="docs">${docsList(c).map((d) => {
    const key = `${c.id}:${d.type}`;
    const src = docSrc(c, d.type);
    let actions = "";
    if (d.status === "manquant") {
      actions = `<button class="btn btn--sm" data-action="doc-counter" data-cid="${c.id}" data-type="${d.type}">Original vérifié au comptoir</button>`;
    } else if (ui.docRefuse === key) {
      actions = `<select class="select" id="doc-reason" aria-label="Motif du refus">${DOC_REASONS.map((r) => `<option>${r}</option>`).join("")}</select>
        <button class="btn btn--sm btn--ko" data-action="doc-ko-confirm" data-cid="${c.id}" data-type="${d.type}">Refuser ce document</button>
        <button class="btn btn--sm btn--ghost" data-action="doc-ko-cancel">Annuler</button>`;
    } else {
      actions = `<button class="btn btn--sm btn--ok" data-action="doc-ok" data-cid="${c.id}" data-type="${d.type}" ${d.status === "valide" ? "disabled" : ""}>✓ Conforme</button>
        <button class="btn btn--sm btn--ko" data-action="doc-ko" data-cid="${c.id}" data-type="${d.type}" ${d.status === "refuse" ? "disabled" : ""}>✕ Non conforme</button>`;
    }
    return `<div class="doc">
      ${src ? `<button class="doc__thumb" data-action="view-doc" data-cid="${c.id}" data-type="${d.type}" aria-label="Agrandir le document"><img src="${src}" alt=""></button>` : `<div class="doc__thumb">Pas de fichier</div>`}
      <div style="min-width:0">
        <div class="doc__title">${DOC_TYPES[d.type].label} ${dPill(d)}</div>
        <div class="doc__meta">${d.status === "manquant" ? "Le client n'a rien envoyé." : `Envoyé ${fmtRel(d.day)}${d.counter ? " · original vérifié au comptoir" : ""}`}</div>
        ${d.status === "refuse" ? `<div class="doc__reason">Motif : ${esc(d.reason)}</div>` : ""}
        <div class="doc__actions">${actions}</div>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function thumbGrid(photos) {
  return `<div class="thumbs">${photos.map((p) => `<div class="thumb"><button data-action="lightbox" aria-label="Agrandir la photo"><img src="${p}" alt=""></button></div>`).join("")}</div>`;
}
function pendingThumbs() {
  return ui.pendingPhotos.map((p, i) => `<div class="thumb"><button data-action="lightbox" aria-label="Agrandir"><img src="${p}" alt=""></button><div class="thumb__tools"><button data-action="pending-del" data-idx="${i}" aria-label="Retirer la photo">✕</button></div></div>`).join("");
}
function photoInput(id, label) {
  return `<div><div class="sub-title">${label}</div><div class="thumbs"><span id="pending-thumbs" style="display:contents">${pendingThumbs()}</span>
    <label class="thumb thumb--add">+ Ajouter des photos<input class="sr-only" type="file" accept="image/*" multiple id="${id}"></label></div></div>`;
}
