/* =========================================================
   Touge Fleet — scripts de la vitrine
   Chaque fonctionnalité est une petite fonction indépendante,
   lancée une fois le DOM chargé (voir tout en bas).
   ========================================================= */

/* En-tête : fond opaque dès qu'on a un peu défilé */
function initHeader() {
  const header = document.querySelector(".header");
  if (!header) return;

  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/* Menu burger sur mobile */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    nav.classList.toggle("is-open", open);
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // Referme le menu après un clic sur un lien
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

/* Compteur animé de 0 jusqu'à la valeur de data-count */
function animateCount(el) {
  const target = Number(el.dataset.count);
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ralentit à la fin
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

/* Compte-tours : remplit l'arc selon data-gauge (en %) */
function fillGauge(el) {
  const ARC_LENGTH = 377; // même valeur que stroke-dasharray dans components.css
  const percent = Number(el.dataset.gauge);
  el.style.strokeDashoffset = ARC_LENGTH * (1 - percent / 100);
}

/* Lance les animations quand les éléments entrent à l'écran */
function initOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      if (el.classList.contains("reveal")) el.classList.add("is-visible");
      if (el.dataset.count) animateCount(el);
      if (el.dataset.gauge) fillGauge(el);

      observer.unobserve(el); // une seule fois
    });
  }, { threshold: 0.2 });

  document
    .querySelectorAll(".reveal, [data-count], [data-gauge]")
    .forEach((el) => observer.observe(el));
}

/* Formulaire de contact : validation côté client uniquement.
   L'envoi réel sera fait en PHP plus tard (action="contact.php"). */
function initContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const feedback = form.querySelector(".form__feedback");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const fields = [...form.querySelectorAll("[required]")];
    fields.forEach((field) => field.classList.toggle("is-invalid", !field.checkValidity()));

    const firstInvalid = fields.find((field) => !field.checkValidity());
    if (firstInvalid) {
      feedback.textContent = "Merci de compléter les champs en rouge.";
      feedback.classList.add("is-error");
      firstInvalid.focus();
      return;
    }

    feedback.textContent = "Demande prête au départ ! (envoi bientôt branché côté PHP)";
    feedback.classList.remove("is-error");
    form.reset();
  });
}

/* Année courante dans le pied de page */
function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initNav();
  initOnScroll();
  initContactForm();
  initYear();
});
