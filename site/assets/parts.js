/* Shared parts for the three TruDrive mockups:
   - smooth scroll (Lenis, wheel and trackpad only, touch stays native)
   - before/after drag sliders
   - the quote sheet, which opens WhatsApp with their details filled in
   - progress helpers so page code can drive a slab lay from an act or from
     a section passing through the viewport

   Gaz never has to log in to anything: a quote arrives as a WhatsApp message
   or a phone call, the two things he already answers. */
(function (global) {
  'use strict';

  var PHONE_DISPLAY = '07923 485811';
  var PHONE_INTL = '447923485811';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  // ---------------------------------------------------------- smooth scroll
  // One clock: Lenis is ticked on the first rAF callback of every frame, and
  // the scrollcraft engine registers its own loop after this, so it always
  // reads the position Lenis has just written.
  var lenis = null;
  function startSmooth() {
    if (reduce || !global.Lenis) return null;
    lenis = new global.Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, anchors: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return lenis;
  }

  // ---------------------------------------------------------- progress
  // Progress of a scrollcraft act, read from the engine's own record.
  function actProgress(actEl) {
    var inst = global.ScrollCraft && global.ScrollCraft.instances[0];
    if (!inst) return 0;
    for (var i = 0; i < inst.acts.length; i++) if (inst.acts[i].el === actEl) return inst.acts[i].p;
    return 0;
  }
  // Progress of an element crossing the viewport: 0 as its top meets the
  // bottom edge, 1 as its bottom meets the top. from/to narrow the window.
  function transit(el, from, to) {
    var r = el.getBoundingClientRect(), vh = innerHeight;
    var raw = (vh - r.top) / (vh + r.height);
    return clamp01((raw - (from || 0)) / ((to == null ? 1 : to) - (from || 0)));
  }
  var loops = [];
  function everyFrame(fn) {
    if (!loops.length) requestAnimationFrame(function tick() { for (var i = 0; i < loops.length; i++) loops[i](); requestAnimationFrame(tick); });
    loops.push(fn);
  }

  // ---------------------------------------------------------- compare
  // <div class="compare" data-compare>
  //   <img class="compare__before" ...> <img class="compare__after" ...>
  // </div>
  // Drag anywhere on it. Vertical swipes still scroll the page on a phone.
  function compare(el) {
    if (el.__cmp) return;
    el.__cmp = true;
    var input = document.createElement('input');
    input.type = 'range'; input.min = 0; input.max = 100; input.value = 50; input.step = 1;
    input.className = 'compare__range';
    input.setAttribute('aria-label', el.getAttribute('data-label') || 'Slide to compare before and after');
    var handle = document.createElement('span');
    handle.className = 'compare__handle'; handle.setAttribute('aria-hidden', 'true');
    handle.innerHTML = '<span class="compare__grip"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    el.appendChild(handle);
    el.appendChild(input);
    function set(v) { v = Math.max(0, Math.min(100, v)); el.style.setProperty('--pos', v + '%'); input.value = Math.round(v); }
    set(50);
    input.addEventListener('input', function () { set(+input.value); });
    var dragging = false, startX = 0, startY = 0, decided = false;
    function at(e) { var r = el.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true; decided = e.pointerType === 'mouse'; startX = e.clientX; startY = e.clientY;
      if (decided) { el.setPointerCapture(e.pointerId); set(at(e)); el.classList.add('is-dragging'); e.preventDefault(); }
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (!decided) {
        var dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { dragging = false; return; }   // it's a scroll
        decided = true; el.setPointerCapture(e.pointerId); el.classList.add('is-dragging');
      }
      set(at(e));
    });
    function end() { dragging = false; el.classList.remove('is-dragging'); }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  // ---------------------------------------------------------- quote sheet
  // Every [data-quote] opens the same <dialog id="quote">. Sending builds a
  // WhatsApp message to Gaz. If WhatsApp cannot open, the number is right
  // there to ring, so an enquiry is never silently lost.
  function quote() {
    var dlg = document.getElementById('quote');
    if (dlg) {
      // [data-quote="Patio"] opens the sheet with that job already picked.
      document.addEventListener('click', function (e) {
        var t = e.target.closest('[data-quote]');
        if (!t) return;
        e.preventDefault();
        var job = t.getAttribute('data-quote');
        var sel = dlg.querySelector('select[name=job]');
        if (job && sel) sel.value = job;
        if (typeof dlg.showModal === 'function') { dlg.showModal(); if (lenis) lenis.stop(); }
        else dlg.setAttribute('open', '');
        var first = dlg.querySelector(job ? 'input, textarea' : 'select, input, textarea');
        if (first) first.focus();
      });
      dlg.addEventListener('close', function () { if (lenis) lenis.start(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      var closeBtn = dlg.querySelector('[data-close]');
      if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
    }
    Array.prototype.forEach.call(document.querySelectorAll('#quote form, form[data-whatsapp]'), bindForm);
  }

  function bindForm(form) {
    var status = form.querySelector('[data-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var job = f.get('job');
      if (!job) {
        status.textContent = 'Pick what you need doing, then send.';
        status.dataset.state = 'error';
        form.querySelector('[name=job]').focus();
        return;
      }
      var lines = ['Hi Gaz, I found TruDrive online and would like a free quote.', '', 'Job: ' + job];
      if (f.get('where')) lines.push('Area: ' + f.get('where'));
      if (f.get('name')) lines.push('Name: ' + f.get('name'));
      if (f.get('notes')) lines.push('', f.get('notes'));
      lines.push('', 'I can send photos of the space here.');
      var url = 'https://wa.me/' + PHONE_INTL + '?text=' + encodeURIComponent(lines.join('\n'));
      // No 'noopener' feature string: with it, open() always returns null and a
      // successful open would read as a blocked one.
      var w = global.open(url, '_blank');
      if (w) w.opener = null;
      status.dataset.state = 'ok';
      status.innerHTML = w ? 'WhatsApp is opening with your message. Add a photo and press send. No WhatsApp? Ring <a href="tel:+' + PHONE_INTL + '">' + PHONE_DISPLAY + '</a>.'
                           : 'Your browser blocked WhatsApp from opening. <a href="' + url + '">Open it here</a>, or ring <a href="tel:+' + PHONE_INTL + '">' + PHONE_DISPLAY + '</a>.';
    });
  }

  function boot() {
    startSmooth();
    Array.prototype.forEach.call(document.querySelectorAll('[data-compare]'), compare);
    quote();
  }

  global.TD = { boot: boot, actProgress: actProgress, transit: transit, everyFrame: everyFrame, compare: compare,
                lenis: function () { return lenis; }, reduce: reduce, PHONE_DISPLAY: PHONE_DISPLAY, PHONE_INTL: PHONE_INTL };
})(window);
