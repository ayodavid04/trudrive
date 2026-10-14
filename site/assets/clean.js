/* TruDrive, clean: header state, phone menu, the before and afters, and a
   quiet rise on each block as it scrolls into view.
   The home hero plays its before-to-after slide once, when the photos are
   ready. That stays the one thing that moves on its own: the rest only
   settles into place as the visitor reaches it. */
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
      // Smooth scroll writes the scroll position itself, so it has to stop too
      // or the wheel moves the page behind the open menu.
      var smooth = window.TD && TD.lenis();
      if (smooth) { if (open) smooth.stop(); else smooth.start(); }
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
    ba.tdSet = set; // the Our work reel (gallery.js) plays its slides through this
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

  // Blocks below the first screen rise 30px and fade in over 1.4s as they
  // arrive, a few at a time. Only blocks that start off screen are ever hidden,
  // and only by this script, so if it fails to run nothing is left invisible.
  // New jobs and photos added in the editor pick this up on their own.
  if (!reduce && 'IntersectionObserver' in window) {
    var blocks = Array.prototype.filter.call(
      document.querySelectorAll('main section:not(.hero) .wrap > *'),
      function (el) { return el.getBoundingClientRect().top > innerHeight; }
    );
    var io = new IntersectionObserver(function (entries) {
      entries.filter(function (e) { return e.isIntersecting; }).forEach(function (e, i) {
        var el = e.target;
        el.style.transitionDelay = (i * 0.08).toFixed(2) + 's';
        el.classList.add('rv-in');
        io.unobserve(el);
        // Once landed, hand the block its own transitions back (hover states).
        el.addEventListener('transitionend', function done(ev) {
          if (ev.target !== el || ev.propertyName !== 'opacity') return;
          el.classList.remove('rv', 'rv-in');
          el.style.transitionDelay = '';
          el.removeEventListener('transitionend', done);
        });
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    blocks.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }
})();
