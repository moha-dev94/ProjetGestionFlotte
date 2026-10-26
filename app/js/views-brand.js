/* =========================================================
   PERSONNALISATION (espace agence)
   Les réglages s'appliquent en direct sur un brouillon (ui.brandDraft) ;
   « Enregistrer » les envoie à l'API pour tous les utilisateurs.
   ========================================================= */
const BRAND_FIELDS = ["name", "tagline", "mark", "accent", "highlight", "ambiance", "fontDisplay", "fontBody"];

function brandDraft() {
  if (!ui.brandDraft) ui.brandDraft = { ...brand, logoData: null, removeLogo: false };
  return ui.brandDraft;
}
function brandDraftChanged() {
  const d = ui.brandDraft;
  return !!d && (!!d.logoData || (d.removeLogo && !!brand.logoFileId) || BRAND_FIELDS.some((k) => d[k] !== brand[k]));
}

function renderBrandEditor() {
  const d = brandDraft();
  const b = currentBrand();
  const options = (fonts, current) => Object.keys(fonts).map((f) => `<option ${f === current ? "selected" : ""}>${esc(f)}</option>`).join("");
  return `
    <p class="muted" style="max-width:76ch">Adaptez l'application à l'agence que vous démarchez : son nom, son logo et ses couleurs. L'aperçu change en direct. « Enregistrer » applique la marque à tous les comptes, clients compris.</p>
    <div class="brand-editor">
      <section class="box">
        <div class="section-title"><h2>Identité</h2></div>
        <div class="form">
          <label class="full">Nom de l'entreprise<input class="input" data-brand-field="name" maxlength="40" value="${esc(d.name)}"></label>
          <label class="full">Accroche (page de connexion)<input class="input" data-brand-field="tagline" maxlength="60" value="${esc(d.tagline)}"></label>
          <label>Sigle (3 caractères max.)<input class="input" data-brand-field="mark" maxlength="3" value="${esc(d.mark)}" placeholder="${esc(initials(d.name || "?"))}"></label>
          <div class="field">
            <span class="field__label">Logo (remplace le sigle)</span>
            <div class="row-actions">
              <label class="btn btn--sm">${b.logoSrc ? "Changer le logo" : "Choisir une image"}<input class="sr-only" type="file" accept="image/*" id="brand-logo"></label>
              ${b.logoSrc ? `<button class="btn btn--sm btn--ghost" data-action="brand-logo-remove">Retirer</button>` : ""}
            </div>
          </div>
        </div>
      </section>

      <section class="box">
        <div class="section-title"><h2>Direction artistique</h2><span>Partez d'un modèle puis ajustez</span></div>
        <div class="presets">${Object.entries(BRAND_PRESETS).map(([key, p]) => `
          <button class="preset" data-action="brand-preset" data-preset="${key}">
            <span class="preset__sw" style="background:${p.accent}"></span><span class="preset__sw" style="background:${p.highlight}"></span>${p.label}
          </button>`).join("")}</div>
        <div class="form" style="margin-top:16px">
          <label>Couleur principale<input class="input input--color" type="color" data-brand-field="accent" value="${d.accent}"></label>
          <label>Couleur d'accent<input class="input input--color" type="color" data-brand-field="highlight" value="${d.highlight}"></label>
          <label class="full">Ambiance<select class="select" data-brand-field="ambiance">${Object.entries(AMBIANCES).map(([k, a]) => `<option value="${k}" ${k === d.ambiance ? "selected" : ""}>${a.label}</option>`).join("")}</select></label>
          <label>Police des titres<select class="select" data-brand-field="fontDisplay">${options(FONTS_DISPLAY, d.fontDisplay)}</select></label>
          <label>Police du texte<select class="select" data-brand-field="fontBody">${options(FONTS_BODY, d.fontBody)}</select></label>
        </div>
      </section>

      <section class="box brand-preview" id="brand-preview">${brandPreviewHtml()}</section>
    </div>
    <div class="row-actions">
      <button class="btn btn--primary" data-action="brand-save" ${brandDraftChanged() ? "" : "disabled"}>Enregistrer la marque</button>
      <button class="btn" data-action="brand-cancel" ${brandDraftChanged() ? "" : "disabled"}>Annuler les changements</button>
      <button class="btn btn--ghost" data-action="brand-default">Revenir à TougeFleet</button>
    </div>`;
}

function brandPreviewHtml() {
  const b = currentBrand();
  return `
    <div class="section-title"><h2>Aperçu</h2><span>Ce que verront vos clients</span></div>
    <div class="brand-preview__card">
      <div class="brand">${brandMarkHtml(b)}<span class="brand__name">${brandNameHtml(b)}<span class="brand__sub">${esc(b.tagline)}</span></span></div>
      <p class="login__title brand-preview__title">Une flotte,<br><em>une seule clé.</em></p>
      <div class="row-actions">
        <span class="btn btn--primary">Réserver un véhicule</span>
        ${pill("disponible", "Disponible")} ${pill("en_cours", "En cours")} ${pill("demande", "À valider")}
      </div>
    </div>`;
}

/* Mise à jour en direct sans tout redessiner (garde le curseur dans le champ). */
function updateBrandDraft(field, value) {
  brandDraft()[field] = value;
  applyBrand(brandDraft());
  refreshBrandChrome();
}
function refreshBrandChrome() {
  const preview = document.getElementById("brand-preview");
  if (preview) preview.innerHTML = brandPreviewHtml();
  const side = document.querySelector(".side .brand");
  if (side) side.innerHTML = `${brandMarkHtml()}<span class="brand__name">${brandNameHtml()}<span class="brand__sub">Espace agence</span></span>`;
  const changed = brandDraftChanged();
  document.querySelectorAll('[data-action="brand-save"], [data-action="brand-cancel"]').forEach((b) => { b.disabled = !changed; });
}

function applyBrandPreset(key) {
  const { label, ...preset } = BRAND_PRESETS[key];
  Object.assign(brandDraft(), preset);
  applyBrand(brandDraft());
  render();
}
async function setBrandLogo(file) {
  if (!file.type.startsWith("image/")) { toast("Choisissez une image (PNG avec fond transparent de préférence)."); return; }
  try {
    Object.assign(brandDraft(), { logoData: await compressImage(file, 400, "image/png"), removeLogo: false });
    render();
  } catch (e) {
    toast("Impossible de lire cette image. Essayez un autre fichier.");
  }
}
function removeBrandLogo() {
  Object.assign(brandDraft(), { logoData: null, removeLogo: true });
  render();
}
function cancelBrandDraft() {
  ui.brandDraft = null;
  applyBrand(brand);
  render();
}
function resetBrandDraft() {
  ui.brandDraft = { ...BRAND_DEFAULTS, logoFileId: brand.logoFileId, logoData: null, removeLogo: !!brand.logoFileId };
  applyBrand(ui.brandDraft);
  render();
  toast("Valeurs TougeFleet appliquées à l'aperçu. Enregistrez pour les garder.");
}
async function saveBrandDraft() {
  const d = brandDraft();
  if (!d.name.trim()) { toast("Indiquez le nom de l'entreprise."); return; }
  try {
    const payload = Object.fromEntries(BRAND_FIELDS.map((k) => [k, d[k]]));
    const res = await api("brand", { ...payload, logo: d.logoData || "", removeLogo: d.removeLogo });
    ui.brandDraft = null;
    setBrand(res.brand);
    render();
    toast(`Marque « ${res.brand.name} » enregistrée pour tous les comptes.`);
  } catch (e) {
    toast(e.message);
  }
}
