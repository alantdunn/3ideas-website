// Progressive enhancement only — the page is fully usable without this file.
(function () {
  'use strict';

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Back-to-top button: fade in once the hero has scrolled away
  var btn = document.querySelector('.scroll-top');
  if (!btn) return;

  var ticking = false;
  function update() {
    btn.classList.toggle('is-visible', window.scrollY > 300);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  update();

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
