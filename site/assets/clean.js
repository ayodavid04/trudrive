/* TruDrive, clean: header state, phone menu, and the before and afters.
   The home hero plays its before-to-after slide once, when the photos are
   ready. Everything else waits for the visitor to press something. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header picks up a hairline once the page moves.
  var head = document.querySelector('.head');
  if (head) {
    var onScroll = function () { head.classList.toggle('is-scrolled', scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Phone menu.
  var menuBtn = document.querySelector('.head__menu');
  var drawer = document.getElementById('drawer');
  if (menuBtn && drawer) {
    var setOpen = function (open) {
      drawer.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.querySelector('span').textContent = open ? 'Close' : 'Menu';
      document.documentElement.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', function () { setOpen(!drawer.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setOpen(false); menuBtn.focus(); } });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a, [data-quote]')) setOpen(false); });
  }

  // Before and afters.
  function loaded(img) {
    return img.complete && img.naturalWidth ? Promise.resolve() :
      new Promise(function (res) { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.ba'), function (ba) {
    var tag = ba.querySelector('.ba__tag');
    var btns = ba.querySelectorAll('.ba__switch button');
    function set(state) {
      ba.setAttribute('data-state', state);
      if (tag) tag.textContent = state === 'after' ? 'After' : 'Before';
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.value === state)); });
    }
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () { ba.classList.add('is-ready'); set(b.value); });
    });
    if (ba.hasAttribute('data-autoplay')) {
      // The one animation: start on the before, then slide it aside into the after.
      if (reduce) { set('after'); return; }
      set('before');
      Promise.all(Array.prototype.map.call(ba.querySelectorAll('img'), loaded)).then(function () {
        requestAnimationFrame(function () {
          ba.classList.add('is-ready');
          setTimeout(function () { set('after'); }, 1100);
        });
      });
    } else {
      set(ba.getAttribute('data-start') || 'before');
    }
  });

  if (window.TD) TD.boot();
})();
