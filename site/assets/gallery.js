/* TruDrive, Our work: the before and after reel, the filter buttons, video
   previews and the full screen viewer for photos and videos.
   Loaded on every page and does nothing where none of these are. It works
   from what the build wrote into the page, so a job, photo or video added in
   the editor joins in by itself.
   The reel is the one thing on the site that moves on its own besides the
   home hero. It has a pause button, stops when it is off screen, while the
   mouse or keyboard is on it, or as soon as someone picks a job themselves,
   and never plays with reduced motion. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var toArray = function (list) { return Array.prototype.slice.call(list); };
  var smooth = function () { return window.TD && TD.lenis && TD.lenis(); };

  // ------------------------------------------------------------ filters
  // One group at a time, or all. Each part below registers how to show only
  // that group and says how many it has left, and a section with nothing
  // left hides.
  var group = '';
  var parts = [];
  var matches = function (el) { return !group || el.getAttribute('data-group') === group; };
  function onFilter(el, fn) { parts.push({ sec: el.closest('[data-gallery-sec]'), fn: fn }); }
  function applyFilter() {
    var left = new Map();
    parts.forEach(function (p) { var n = p.fn(); if (p.sec) left.set(p.sec, (left.get(p.sec) || 0) + n); });
    left.forEach(function (n, sec) { sec.hidden = n === 0; });
  }
  var filterBar = document.querySelector('[data-filters]');
  if (filterBar) {
    filterBar.hidden = false;
    filterBar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      group = b.getAttribute('data-filter');
      each(filterBar.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      applyFilter();
    });
  }

  // ------------------------------------------------------------ the reel
  each(document.querySelectorAll('[data-show]'), function (show) {
    var slides = toArray(show.querySelectorAll('.show__slide'));
    if (slides.length < 2) return; // one job is just a before and after
    var bar = show.querySelector('.show__bar');
    var strip = show.querySelector('.show__thumbs');
    var thumbs = slides.map(function (s, i) { return show.querySelector('.show__thumb[data-to="' + i + '"]'); });
    var count = show.querySelector('.show__count');
    var playBtn = show.querySelector('[data-play]');
    var BEFORE = 1300, SLIDE = 1350, AFTER = 3400;
    var list = slides.slice();
    var at = 0;
    var timer = 0;
    var paused = reduce;
    var inView = false, holds = 0;

    // Stacked in one place, every slide would download its photos at once.
    // Slides wait with their addresses parked until they are next up.
    function park(s) {
      each(s.querySelectorAll('source, img'), function (el) {
        ['srcset', 'src'].forEach(function (a) {
          if (el.hasAttribute(a)) { el.setAttribute('data-park-' + a, el.getAttribute(a)); el.removeAttribute(a); }
        });
      });
      s.parked = true;
    }
    function unpark(s) {
      if (!s || !s.parked) return;
      each(s.querySelectorAll('source, img'), function (el) {
        ['srcset', 'src'].forEach(function (a) {
          var v = el.getAttribute('data-park-' + a);
          if (v != null) { el.setAttribute(a, v); el.removeAttribute('data-park-' + a); }
        });
      });
      s.parked = false;
    }
    function loaded(s) {
      return Promise.all(toArray(s.querySelectorAll('img')).map(function (img) {
        return img.complete && img.naturalWidth ? null : new Promise(function (res) {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
          setTimeout(res, 6000);
        });
      }));
    }
    function setBa(s, state, animate) {
      var ba = s.querySelector('.ba');
      ba.classList.toggle('is-ready', !!animate);
      if (ba.tdSet) ba.tdSet(state); else ba.setAttribute('data-state', state);
    }
    function fillBar(on) {
      show.classList.remove('is-playing');
      if (on) { void show.offsetWidth; show.classList.add('is-playing'); }
    }
    function running() { return !paused && inView && holds === 0 && !document.hidden; }

    function go(i) {
      clearTimeout(timer);
      if (!list.length) return;
      at = (i + list.length) % list.length;
      var s = list[at];
      unpark(s);
      unpark(list[(at + 1) % list.length]);
      slides.forEach(function (x) { x.classList.toggle('is-on', x === s); });
      var t = thumbs[slides.indexOf(s)];
      thumbs.forEach(function (x) { x.classList.toggle('is-on', x === t); if (x === t) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
      if (t && strip) strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      count.textContent = (at + 1) + ' / ' + list.length;
      cycle(true);
    }
    // Before, hold, the after slides across, hold, next job. fresh: a job
    // just arrived. Otherwise it is picking up again after a hold.
    function cycle(fresh) {
      clearTimeout(timer);
      var s = list[at];
      if (!running()) {
        fillBar(false);
        // Ready on the before, so it never shows the after and then jumps back.
        if (paused) setBa(s, 'after', false); else if (fresh) setBa(s, 'before', false);
        return;
      }
      if (!fresh && s.querySelector('.ba').getAttribute('data-state') === 'after') {
        timer = setTimeout(function () { go(at + 1); }, AFTER);
        return;
      }
      setBa(s, 'before', false);
      fillBar(false);
      loaded(s).then(function () {
        if (s !== list[at] || !running()) return;
        fillBar(true);
        timer = setTimeout(function () {
          setBa(s, 'after', true);
          timer = setTimeout(function () { go(at + 1); }, SLIDE + AFTER);
        }, BEFORE);
      });
    }
    // keep: leave the job exactly as it is showing (someone just tapped its
    // Before or After switch).
    function setPaused(p, keep) {
      paused = p;
      show.classList.toggle('is-paused', p);
      playBtn.setAttribute('aria-label', p ? 'Play' : 'Pause');
      if (keep) { clearTimeout(timer); fillBar(false); } else cycle();
    }
    function hold(on) {
      holds = Math.max(0, holds + (on ? 1 : -1));
      show.classList.toggle('is-held', holds > 0);
      if (!on && holds === 0) cycle(); else clearTimeout(timer);
    }

    show.style.setProperty('--show-dur', (BEFORE + SLIDE + AFTER) / 1000 + 's');
    slides.forEach(function (s, i) { if (i > 1) park(s); });
    show.classList.add('is-live');
    bar.hidden = false;

    // Someone choosing a job takes over from the reel.
    show.querySelector('[data-prev]').addEventListener('click', function () { setPaused(true); go(at - 1); });
    show.querySelector('[data-next]').addEventListener('click', function () { setPaused(true); go(at + 1); });
    playBtn.addEventListener('click', function () { setPaused(!paused); });
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () { setPaused(true); go(list.indexOf(slides[i])); });
    });
    show.addEventListener('click', function (e) { if (e.target.closest('.ba__switch')) setPaused(true, true); });
    show.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { setPaused(true); go(at + (e.key === 'ArrowRight' ? 1 : -1)); }
    });
    // Swipe on a phone.
    var slidesEl = show.querySelector('.show__slides');
    var x0 = null;
    slidesEl.addEventListener('pointerdown', function (e) { x0 = e.pointerType === 'mouse' ? null : e.clientX; });
    slidesEl.addEventListener('pointerup', function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { setPaused(true); go(at + (dx < 0 ? 1 : -1)); }
    });
    // Reading it, pointing at it or tabbing through it holds it still.
    slidesEl.addEventListener('mouseenter', function () { hold(true); });
    slidesEl.addEventListener('mouseleave', function () { hold(false); });
    // Keyboard focus only: a mouse click focuses a button too, and must not freeze it.
    show.addEventListener('focusin', function (e) { if (!show.held && e.target.matches(':focus-visible')) { show.held = true; hold(true); } });
    show.addEventListener('focusout', function (e) { if (!show.contains(e.relatedTarget) && show.held) { show.held = false; hold(false); } });
    document.addEventListener('visibilitychange', function () { cycle(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; cycle(); }, { threshold: 0.4 }).observe(slidesEl);
    }

    onFilter(show, function () {
      list = slides.filter(matches);
      thumbs.forEach(function (t, i) { t.hidden = list.indexOf(slides[i]) < 0; });
      go(0);
      return list.length;
    });

    // A link to one job (our-work/#job-...) opens on it, still.
    var start = location.hash ? slides.indexOf(document.getElementById(decodeURIComponent(location.hash.slice(1)))) : -1;
    setPaused(paused || start > -1);
    go(Math.max(0, start));
  });

  // ------------------------------------------------------------ videos
  each(document.querySelectorAll('.vids'), function (row) {
    var cards = toArray(row.querySelectorAll('.vid'));
    onFilter(row, function () {
      var n = 0;
      cards.forEach(function (c) { c.hidden = !matches(c); if (!c.hidden) n++; });
      return n;
    });
    // A silent preview while the mouse is on a card. Phones tap to play.
    if (!mouse || reduce || saveData) return;
    cards.forEach(function (c) {
      var v = c.querySelector('video');
      if (!v) return;
      var btn = c.querySelector('.vid__open');
      btn.addEventListener('mouseenter', function () {
        if (!v.getAttribute('src') && v.getAttribute('data-src')) v.setAttribute('src', v.getAttribute('data-src'));
        var p = v.play();
        if (p && p.then) p.then(function () { c.classList.add('is-previewing'); }, function () {});
      });
      btn.addEventListener('mouseleave', function () { v.pause(); c.classList.remove('is-previewing'); });
    });
  });

  // ------------------------------------------------------------ photos
  // The first dozen, then a button for more, so the page stays light.
  each(document.querySelectorAll('.gallery[data-more]'), function (grid) {
    var step = parseInt(grid.getAttribute('data-more'), 10) || 12;
    var items = toArray(grid.querySelectorAll('figure'));
    var shown = step;
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'btn btn--ghost more-btn';
    grid.insertAdjacentElement('afterend', more);
    function update() {
      var list = items.filter(matches);
      items.forEach(function (f) { f.hidden = true; });
      list.forEach(function (f, i) { f.hidden = i >= shown; });
      var left = list.length - shown;
      more.hidden = left <= 0;
      more.textContent = 'Show ' + Math.min(left, step) + ' more';
      return list.length;
    }
    more.addEventListener('click', function () {
      var next = items.filter(matches)[shown];
      shown += step;
      update();
      if (next) next.querySelector('button').focus({ preventScroll: true });
    });
    onFilter(grid, function () { shown = step; return update(); });
    update();
  });

  // ------------------------------------------------------------ viewer
  // Photos and videos full screen, one dialog for the page. Next and back go
  // through the same row, only what the filter shows.
  var dlg = null, items = [], idx = 0, opener = null;
  var ICON = {
    close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Photos and videos');
    dlg.innerHTML = '<div class="lb__top"><span class="lb__count" aria-live="polite"></span><button class="lb__close" type="button" aria-label="Close">' + ICON.close + '</button></div>' +
      '<div class="lb__stage"></div>' +
      '<button class="lb__nav lb__prev" type="button" aria-label="Previous">' + ICON.prev + '</button>' +
      '<button class="lb__nav lb__next" type="button" aria-label="Next">' + ICON.next + '</button>' +
      '<p class="lb__cap"></p>';
    document.body.appendChild(dlg);
    var stage = dlg.querySelector('.lb__stage');
    dlg.querySelector('.lb__close').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('.lb__prev').addEventListener('click', function () { view(idx - 1); });
    dlg.querySelector('.lb__next').addEventListener('click', function () { view(idx + 1); });
    stage.addEventListener('click', function (e) { if (e.target === stage) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') view(idx + 1);
      if (e.key === 'ArrowLeft') view(idx - 1);
    });
    var x0 = null;
    stage.addEventListener('pointerdown', function (e) { x0 = e.pointerType === 'mouse' ? null : e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) view(idx + (dx < 0 ? 1 : -1));
    });
    dlg.addEventListener('close', function () {
      stage.innerHTML = ''; // stops a playing video or TikTok
      document.documentElement.style.overflow = '';
      var s = smooth(); if (s) s.start();
      if (opener) opener.focus({ preventScroll: true });
    });
  }
  function esc(t) { var d = document.createElement('span'); d.textContent = t || ''; return d.innerHTML; }
  function view(i) {
    if (!items.length) return;
    idx = (i + items.length) % items.length;
    var b = items[idx];
    var stage = dlg.querySelector('.lb__stage');
    var kind = b.getAttribute('data-lb');
    var title = b.getAttribute('data-title') || '';
    var line = b.getAttribute('data-line') || '';
    stage.innerHTML = '';
    var el;
    if (kind === 'image') {
      el = document.createElement('img');
      el.sizes = '100vw';
      el.srcset = b.getAttribute('data-srcset');
      el.width = +b.getAttribute('data-w'); el.height = +b.getAttribute('data-h');
      el.alt = (b.querySelector('img') || {}).alt || title;
      el.decoding = 'async';
    } else if (kind === 'video') {
      el = document.createElement('video');
      el.src = b.getAttribute('data-src');
      el.controls = true; el.playsInline = true; el.autoplay = true; el.preload = 'auto';
      if (b.getAttribute('data-poster')) el.poster = b.getAttribute('data-poster');
      el.width = +b.getAttribute('data-w'); el.height = +b.getAttribute('data-h');
      el.setAttribute('aria-label', title);
    } else {
      // TikTok's own player, asked for only now that someone pressed play.
      el = document.createElement('iframe');
      el.src = 'https://www.tiktok.com/player/v1/' + encodeURIComponent(b.getAttribute('data-src')) + '?autoplay=1&rel=0&description=0&music_info=0';
      el.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
      el.title = title + ' (TikTok video)';
    }
    stage.appendChild(el);
    if (kind === 'video') { var p = el.play(); if (p && p.catch) p.catch(function () {}); }
    dlg.querySelector('.lb__count').textContent = items.length > 1 ? (idx + 1) + ' / ' + items.length : '';
    each(dlg.querySelectorAll('.lb__nav'), function (n) { n.hidden = items.length < 2; });
    dlg.querySelector('.lb__cap').innerHTML = '<b>' + esc(title) + '</b>' + (line ? '<span>' + esc(line) + '</span>' : '') +
      (kind === 'tiktok' ? '<span>Playing from TikTok. <a href="https://www.tiktok.com/@tru.drive/video/' + esc(b.getAttribute('data-src')) + '" rel="noopener" target="_blank">Open in TikTok</a></span>' : '');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lb]');
    if (!b || typeof HTMLDialogElement !== 'function') return; // very old browsers: nothing to open
    e.preventDefault();
    if (!dlg) build();
    var box = b.closest('.gallery, .vids') || document;
    items = toArray(box.querySelectorAll('[data-lb]')).filter(function (x) { return !x.closest('[hidden]'); });
    opener = b;
    view(items.indexOf(b));
    document.documentElement.style.overflow = 'hidden';
    var s = smooth(); if (s) s.stop();
    // A video previewing on its card stops while the full one plays.
    each(document.querySelectorAll('.vid video'), function (v) { v.pause(); });
    dlg.showModal();
  });

})();
