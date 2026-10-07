/* Slab laying: the signature move.
   The after photo is cut into slabs in stretcher bond and laid over the before
   photo in laying order as progress runs 0 to 1. Each slab is lowered into
   place with its shadow, the joints stay open while laying, and they grout shut
   over the last stretch so the final frame is exactly the after photo.

   Markup:
     <div class="slablay" data-cols="5 7" data-ratio="1.5">
       <canvas aria-hidden="true"></canvas>
       <img class="slablay__before" src="..." alt="Before: ..." data-focus="50 55">
       <img class="slablay__after"  src="..." alt="After: ..."  data-focus="50 55">
     </div>

   const lay = new SlabLay(el, { order, prelaid, drop, overshoot });
   lay.render(p)   // call every frame with 0..1; it redraws only on change.

   Nothing here is generated. Every pixel of every slab is Gaz's own photo. */
(function (global) {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeBack = function (t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  var small = matchMedia('(max-width: 860px)');
  function focusOf(img) {
    var raw = (small.matches && img.getAttribute('data-focus-mobile')) || img.getAttribute('data-focus') || '50 50';
    var f = raw.split(/\s+/).map(Number);
    return { x: (f[0] || 50) / 100, y: (f[1] || 50) / 100 };
  }

  // Source mapping for object-fit: cover with a focal point.
  function cover(img, cw, ch) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(cw / iw, ch / ih);
    var f = focusOf(img);
    return { s: s, ox: (cw - iw * s) * f.x, oy: (ch - ih * s) * f.y };
  }

  function SlabLay(el, opts) {
    this.el = el;
    this.opts = opts || {};
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.before = el.querySelector('.slablay__before');
    this.after = el.querySelector('.slablay__after');
    this.p = -1;
    this.ready = false;
    this.tiles = [];
    var self = this;
    Promise.all([this.before, this.after].map(function (img) {
      return img.complete && img.naturalWidth ? Promise.resolve() :
        new Promise(function (res) { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
    })).then(function () {
      self.ready = true;
      self.layout();
      el.classList.add('slablay--live');
    });
    // A <picture> swaps files when the screen crosses its breakpoint.
    [this.before, this.after].forEach(function (img) {
      img.addEventListener('load', function () { if (self.ready) self.layout(); });
    });
    if ('ResizeObserver' in global) {
      new ResizeObserver(function () { if (self.ready) self.layout(); }).observe(el);
    }
  }

  SlabLay.prototype.layout = function () {
    var r = this.el.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.cb = cover(this.before, w, h);
    this.ca = cover(this.after, w, h);

    // Slab grid: stretcher bond, like 900 x 600 porcelain.
    var cols = (this.el.getAttribute('data-cols') || '5 7').split(/\s+/).map(Number);
    var n = w > 860 ? (cols[1] || cols[0]) : cols[0];
    var ratio = parseFloat(this.el.getAttribute('data-ratio')) || 1.5;
    var sw = w / n, sh = sw / ratio;
    var rows = Math.ceil(h / sh);
    var tiles = [];
    for (var row = 0; row < rows; row++) {
      var shift = row % 2 ? -sw / 2 : 0;
      var line = [];
      for (var c = 0; c <= n; c++) {
        var x0 = shift + c * sw, x1 = x0 + sw;
        if (x1 <= 0 || x0 >= w) continue;
        line.push({ x: Math.max(0, x0), y: row * sh, w: Math.min(w, x1) - Math.max(0, x0), h: Math.min(sh, h - row * sh), row: row, col: c, cx: (x0 + x1) / 2 });
      }
      // A layer works along the line and back again.
      if (row % 2) line.reverse();
      tiles = tiles.concat(line);
    }
    var order = this.opts.order;
    var prelaid = this.opts.prelaid;
    var self = this;
    tiles.forEach(function (t, i) {
      t.pre = prelaid ? !!prelaid(t, self) : false;
      t.key = order ? order(t, self, i) : i;
    });
    var laying = tiles.filter(function (t) { return !t.pre; }).sort(function (a, b) { return a.key - b.key; });
    var N = laying.length;
    // About four slabs in motion at once.
    var win = Math.min(0.35, 4 / Math.max(N, 1));
    laying.forEach(function (t, i) { t.start = N > 1 ? (i / (N - 1)) * (1 - win) : 0; t.win = win; });
    this.tiles = tiles;
    this.sw = sw; this.sh = sh;
    this.p = -1;
    if (this.lastP != null) this.render(this.lastP);
  };

  SlabLay.prototype.drawPart = function (img, map, x, y, w, h, dx, dy, dw, dh) {
    // Source rect for the canvas region (x, y, w, h), drawn at (dx, dy, dw, dh).
    var sx = (x - map.ox) / map.s, sy = (y - map.oy) / map.s;
    var sW = w / map.s, sH = h / map.s;
    var d = this.dpr;
    this.ctx.drawImage(img, sx, sy, sW, sH, dx * d, dy * d, dw * d, dh * d);
  };

  // Rebuild the grid and redraw, for when the page moves the split line.
  SlabLay.prototype.refresh = function () { if (this.ready) this.layout(); };

  // Where the laying has got to, 0..1, for pages that move chrome with it.
  SlabLay.prototype.layProgress = function (p) { return clamp01(clamp01(p) / 0.9); };

  SlabLay.prototype.render = function (p) {
    this.lastP = p;
    if (!this.ready) return;
    p = clamp01(p);
    if (Math.abs(p - this.p) < 0.0004) return;
    this.p = p;
    var ctx = this.ctx, w = this.w, h = this.h, d = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    // Split mode: the frame starts as before | after, divided at a line, and
    // only the before side gets laid.
    var split = this.opts.split ? this.opts.split(this) : null;
    if (split && split.axis === 'x') {
      this.drawPart(this.before, this.cb, 0, 0, split.at, h, 0, 0, split.at, h);
      this.drawPart(this.after, this.ca, split.at, 0, w - split.at, h, split.at, 0, w - split.at, h);
    } else if (split) {
      this.drawPart(this.before, this.cb, 0, 0, w, split.at, 0, 0, w, split.at);
      this.drawPart(this.after, this.ca, 0, split.at, w, h - split.at, 0, split.at, w, h - split.at);
    } else {
      this.drawPart(this.before, this.cb, 0, 0, w, h, 0, 0, w, h);
    }

    if (reduce) {
      // Fewer and gentler: a crossfade, no movement.
      ctx.globalAlpha = p * p * (3 - 2 * p);
      this.drawPart(this.after, this.ca, 0, 0, w, h, 0, 0, w, h);
      ctx.globalAlpha = 1;
      return;
    }

    var layP = clamp01(p / 0.9);            // laying
    var grout = clamp01((p - 0.9) / 0.1);    // joints close
    var joint = Math.max(0, 2.5 * (1 - grout));
    var drop = this.opts.drop != null ? this.opts.drop : 0.5;
    var bounce = !!this.opts.overshoot;
    var jointFill = this.opts.jointColor || 'rgba(22, 24, 26, 0.72)';
    var moving = [];

    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i];
      if (t.pre && split) continue;          // already part of the after side
      var k = t.pre ? 1 : clamp01((layP - t.start) / t.win);
      if (k <= 0) continue;
      if (k < 1) { moving.push({ t: t, k: k }); continue; }
      // Laid: joint underneath, slab inset by half a joint each side.
      if (joint > 0.05 && !t.pre) {
        ctx.fillStyle = jointFill;
        ctx.fillRect(t.x * d, t.y * d, t.w * d, t.h * d);
        var j = joint / 2;
        this.drawPart(this.after, this.ca, t.x + j, t.y + j, t.w - 2 * j, t.h - 2 * j, t.x + j, t.y + j, t.w - 2 * j, t.h - 2 * j);
      } else {
        this.drawPart(this.after, this.ca, t.x, t.y, t.w, t.h, t.x, t.y, t.w, t.h);
      }
    }

    // Slabs in motion go on top, lowered into place with a shadow that tightens.
    for (var m = 0; m < moving.length; m++) {
      var tt = moving[m].t, kk = moving[m].k;
      var e = bounce ? easeBack(kk) : easeOut(kk);
      var lift = (1 - e) * tt.h * drop;
      var sc = 1 + (1 - e) * (bounce ? 0.22 : 0.07);
      var dw = tt.w * sc, dh = tt.h * sc;
      var dx = tt.x - (dw - tt.w) / 2, dy = tt.y - (dh - tt.h) / 2 - lift;
      ctx.save();
      ctx.globalAlpha = Math.min(1, kk * 2.2);
      ctx.shadowColor = 'rgba(10, 12, 14, ' + (0.45 * (1 - e) + 0.15).toFixed(3) + ')';
      ctx.shadowBlur = (6 + 22 * (1 - e)) * d;
      ctx.shadowOffsetY = (3 + 16 * (1 - e)) * d;
      ctx.fillStyle = jointFill;
      ctx.fillRect(dx * d, dy * d, dw * d, dh * d);
      ctx.restore();
      ctx.globalAlpha = Math.min(1, kk * 2.2);
      this.drawPart(this.after, this.ca, tt.x, tt.y, tt.w, tt.h, dx, dy, dw, dh);
      // The top edge catches the light as it comes down.
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.28 * (1 - e)).toFixed(3) + ')';
      ctx.fillRect(dx * d, dy * d, dw * d, Math.max(1, d));
      ctx.globalAlpha = 1;
    }
  };

  global.SlabLay = SlabLay;
})(window);
