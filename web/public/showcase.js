/**
 * Voto+ Desktop Screenshot Carousel
 *
 * Modern software-showcase style:
 * - Auto-play ogni 5s con pausa on-hover
 * - Prev/Next arrows
 * - Thumbnails cliccabili sotto (con scroll orizzontale su mobile)
 * - Cross-fade tra slide (600ms)
 * - Label descrittiva su ogni slide
 * - Pause quando il tab è nascosto (energy-friendly)
 * - Keyboard navigation (arrow left/right)
 */
(function () {
  "use strict";

  // Path root-assoluto per funzionare da qualsiasi pagina (es. /download/,
  // /blog/xxx/). Astro deploya il contenuto di /public/ nella root del sito.
  var BASE = "/assets/screens/";
  var SLIDES = [
    { file: "voto-desktop-home-demo.png", label: "Home — la tua dashboard di studio" },
    { file: "voto-desktop-azione-interrogazione-demo.png", label: "Interrogazione con l'AI Professore" },
    { file: "voto-desktop-azione-compito-demo.png", label: "Compito in classe simulato" },
    { file: "voto-desktop-azione-tema-demo.png", label: "Tema svolto con l'AI" },
    { file: "voto-desktop-azione-vocabolario-ai-demo.png", label: "Vocabolario AI multilingua" },
    { file: "voto-desktop-matematica-demo.png", label: "Matematica passo passo" },
    { file: "voto-desktop-scannerizza-demo.png", label: "Scannerizza appunti e libri" },
    { file: "voto-desktop-voti-demo.png", label: "Registro voti e trend" },
    { file: "voto-desktop-calendario-demo.png", label: "Calendario compiti in classe" },
    { file: "voto-desktop-cronologia-demo.png", label: "Cronologia sessioni di studio" },
    { file: "voto-desktop-traguardi-demo.png", label: "Traguardi e badge sbloccati" },
    { file: "voto-desktop-novita-demo.png", label: "Novità in ogni versione" },
    { file: "voto-desktop-impostazioni-demo.png", label: "Impostazioni e profilo" },
  ];

  var slidesEl = document.getElementById("slides");
  var thumbsEl = document.getElementById("thumbs");
  var labelEl = document.getElementById("slide-label");
  var prevBtn = document.getElementById("prev-slide");
  var nextBtn = document.getElementById("next-slide");

  if (!slidesEl || !thumbsEl) return; // sezione non presente in pagina

  var current = 0;
  var autoTimer = null;
  var AUTOPLAY_MS = 5000;

  // Build slide DOM (behind the controls that already exist)
  SLIDES.forEach(function (s, i) {
    var div = document.createElement("div");
    div.className = "slide" + (i === 0 ? " active" : "");
    var img = document.createElement("img");
    img.src = BASE + s.file;
    img.alt = s.label;
    img.loading = i === 0 ? "eager" : "lazy";
    div.appendChild(img);
    // Insert before controls (which are already in slidesEl)
    slidesEl.insertBefore(div, prevBtn);
  });

  // Build thumbnails
  SLIDES.forEach(function (s, i) {
    var t = document.createElement("div");
    t.className = "thumb" + (i === 0 ? " active" : "");
    t.setAttribute("data-index", String(i));
    t.setAttribute("aria-label", s.label);
    var img = document.createElement("img");
    img.src = BASE + s.file;
    img.alt = "";
    img.loading = "lazy";
    t.appendChild(img);
    t.addEventListener("click", function () {
      goTo(i);
      resetAutoplay();
    });
    thumbsEl.appendChild(t);
  });

  labelEl.textContent = SLIDES[0].label;

  function goTo(idx) {
    if (idx < 0) idx = SLIDES.length - 1;
    if (idx >= SLIDES.length) idx = 0;
    var slideNodes = slidesEl.querySelectorAll(".slide");
    var thumbNodes = thumbsEl.querySelectorAll(".thumb");
    slideNodes[current].classList.remove("active");
    thumbNodes[current].classList.remove("active");
    current = idx;
    slideNodes[current].classList.add("active");
    thumbNodes[current].classList.add("active");
    labelEl.textContent = SLIDES[current].label;
    // Scroll thumbnail into view (smooth) on mobile
    thumbNodes[current].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  prevBtn.addEventListener("click", function () { prev(); resetAutoplay(); });
  nextBtn.addEventListener("click", function () { next(); resetAutoplay(); });

  // Keyboard navigation (when showcase is in viewport)
  document.addEventListener("keydown", function (e) {
    if (!slidesEl.getBoundingClientRect().top < window.innerHeight) return;
    if (e.key === "ArrowLeft") { prev(); resetAutoplay(); }
    if (e.key === "ArrowRight") { next(); resetAutoplay(); }
  });

  // Autoplay
  function startAutoplay() {
    stopAutoplay();
    autoTimer = setInterval(next, AUTOPLAY_MS);
  }
  function stopAutoplay() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }
  function resetAutoplay() {
    if (autoTimer) startAutoplay();
  }

  slidesEl.addEventListener("mouseenter", stopAutoplay);
  slidesEl.addEventListener("mouseleave", startAutoplay);

  // Pausa quando il tab è nascosto (energy-friendly)
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  // Touch swipe (mobile)
  var touchStartX = 0;
  slidesEl.addEventListener("touchstart", function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  slidesEl.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) prev(); else next();
    resetAutoplay();
  }, { passive: true });

  // Start
  startAutoplay();
})();
