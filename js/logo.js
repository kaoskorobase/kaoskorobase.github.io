/*
 * Animated header logo for declaredvolatile.org
 *
 * A sine wave travels to the right, dissolves into an ASCII glitch tail and
 * is finally digitised into a stream of bits:
 *
 *      ,-.
 *     /   \        .
 *   declared volatile:'00.1-11001...
 *          \   /     ,
 *           `-*
 *
 * Everything is generated from the numbers in CONFIG; tweak those to change
 * the look. Without JavaScript the static copy of the logo in index.html
 * stays; this script replaces it.
 */
(function () {
  'use strict';

  var el = document.getElementById('logo');
  if (!el) return;

  var CONFIG = {
    title: 'declared volatile',

    rows: 5,                 // height of the picture in characters
    maxCols: 38,             // width on wide screens, in characters
    minCols: 22,             // never narrower than this
    centerRow: 2,            // the axis; the title and the bits sit on it

    // The wave
    amplitude: 2.4,          // in rows, at the left edge
    ampFrom: 0,              // the wave shrinks between these two columns...
    ampTo: 17,               // ...i.e. over the length of the title
    ampDecay: 0.88,          // fraction of the amplitude lost by ampTo
    wavelength: 12,          // in columns
    speed: 1,                // whole columns per tick keep the shape crisp

    // The glitch tail
    dissolveAt: 0.34,        // the wave breaks up at this fraction of the width,
                             // so narrow screens start the tail earlier
    scatter: 0.7,            // how far (rows) fragments stray; ~0 keeps the tail a line
    glitchChars: ".,'`:;-~*+",
    dust: 0.12,              // density of random speckles in the tail
    tearChance: 0.03,        // chance per tick of the axis line tearing sideways
    tearSpread: 0.15,        // chance that the tear lands one row off the axis

    // The wave corrupts the title where it passes through it
    titleGlitchChars: "01#%&@?!<>/|~^",
    titleGlitchChance: 0.35, // chance that a short window of time glitches
    titleGlitchWindow: 8,    // ticks per window
    titleGlitchDensity: 0.5, // fraction of touched letters that flip

    // The digitised signal
    bitsMax: 10,             // number of bits on wide screens; fewer on narrow ones
    bitsEvery: 2,            // shift the register every n ticks

    tickMs: 110,
    holdTicks: 4             // how long a fragment keeps its look
  };

  var C = CONFIG;
  var TILE_COLORS = { wave: 'curve', bits: 'digit' };

  // --- helpers -------------------------------------------------------------

  // Deterministic pseudo random number in [0, 1) from two integers.
  function hash(a, b) {
    var h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function smoothstep(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function esc(ch) {
    return ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
  }

  function dissolve(x) {
    return smoothstep((x - L.dissolveFrom) / (L.dissolveTo - L.dissolveFrom));
  }

  // --- layout --------------------------------------------------------------
  //
  // The font size is fixed by the page's CSS. The picture adapts to the width
  // instead: on narrow screens it has fewer columns, fewer bits, and the glitch
  // tail starts earlier.

  var L = {};                        // cols, dissolveFrom, dissolveTo, bitsCol, bitsLength

  function charWidth() {
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    probe.textContent = '0000000000';
    el.appendChild(probe);
    var w = probe.getBoundingClientRect().width / 10;
    el.removeChild(probe);
    return w || 10;
  }

  function availableWidth() {
    var cs = window.getComputedStyle(document.body);
    return document.body.clientWidth -
           parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function layout() {
    var T = C.title.length;
    L.cols = clamp(Math.floor((availableWidth() - 1) / charWidth()),
                   C.minCols, C.maxCols);
    L.dissolveFrom = Math.round(C.dissolveAt * L.cols);
    L.dissolveTo = L.cols - 1;
    L.bitsCol = T + 2;               // just after the title
    L.bitsLength = clamp(Math.floor((L.cols - T - 1) / 2), 3, C.bitsMax);
    fitBits();
  }

  // --- the wave ------------------------------------------------------------

  var tick = 0;
  var phase = 0;

  // Row (an integer) of the wave in column x.
  function waveRow(x) {
    var shrink = smoothstep((x - C.ampFrom) / (C.ampTo - C.ampFrom));
    var a = C.amplitude * (1 - C.ampDecay * shrink);
    var y = C.centerRow -
            a * Math.sin(2 * Math.PI * (x - phase) / C.wavelength);
    return clamp(Math.round(y), 0, C.rows - 1);
  }

  // The character that connects the wave to its neighbours.
  function waveChar(x) {
    var r = waveRow(x), l = waveRow(x - 1), n = waveRow(x + 1);
    var top = r < C.centerRow;
    if ((l - r) * (n - r) > 0) return '-';           // a single-column peak
    if (l === r && n === r) return '-';              // plateau
    if (l !== r && n === r) return top ? ',' : '`';  // start of a plateau
    if (l === r && n !== r) return top ? '.' : '*';  // end of a plateau
    if (r === C.centerRow) return '+';               // zero crossing
    return n < l ? '/' : '\\';                       // on a slope
  }

  // --- the bits ------------------------------------------------------------

  var bits = '00 1 11001'.split('');

  function randomBit() {
    return Math.random() < 0.2 ? ' ' : Math.random() < 0.5 ? '0' : '1';
  }

  // Grow or shrink the register to the current width.
  function fitBits() {
    while (bits.length > L.bitsLength) bits.shift();
    while (bits.length < L.bitsLength) bits.push(randomBit());
  }

  function clockBit() {
    bits.shift();
    bits.push(randomBit());
  }

  // --- the picture ---------------------------------------------------------

  var tear = { row: -1, ticks: 0 };

  function pickGlitch(a, b) {
    return C.glitchChars.charAt(Math.floor(hash(a, b) * C.glitchChars.length));
  }

  // Builds a rows x cols grid of [char, class] (or null for blank).
  function compose() {
    var g = [], r, x;
    for (r = 0; r < C.rows; r++) {
      g.push([]);
      for (x = 0; x < L.cols; x++) g[r].push(null);
    }

    var slot = Math.floor(tick / C.holdTicks);

    for (x = 0; x < L.cols; x++) {
      var d = dissolve(x);
      var row = waveRow(x);
      // Fragments are tied to the wave, so they travel with it, but they
      // are re-rolled every few ticks and die off towards the right.
      var w = Math.floor(x - phase);

      if (hash(w, slot) >= d) {
        g[row][x] = [waveChar(x), TILE_COLORS.wave];
      } else if (hash(w + 1000, slot) < 0.85 - 0.45 * d) {
        var dr = Math.round((hash(w + 2000, slot) * 2 - 1) * C.scatter * d);
        g[clamp(row + dr, 0, C.rows - 1)][x] =
          [pickGlitch(w + 3000, slot), TILE_COLORS.wave];
      }

      // Short-lived speckles.
      if (d > 0 && hash(x + 5000, tick) < C.dust * d) {
        g[clamp(C.centerRow + Math.floor(hash(x + 6000, tick) * 3) - 1,
                0, C.rows - 1)][x] =
          [pickGlitch(x + 7000, tick), TILE_COLORS.wave];
      }
    }

    // A row tears sideways now and then.
    if (tear.ticks > 0) {
      tear.ticks--;
      for (x = Math.floor(L.dissolveFrom); x < L.cols; x++) {
        if (hash(x + 8000, tick) < 0.7) {
          g[tear.row][x] = [pickGlitch(x + 9000, tick) === ' ' ? '#' : pickGlitch(x + 9000, tick),
                            TILE_COLORS.wave];
        }
      }
    }

    // The bits sit on the axis, behind the title.
    for (x = 0; x < L.bitsLength; x++) {
      if (bits[x] !== ' ') {
        g[C.centerRow][L.bitsCol + x] = [bits[x], TILE_COLORS.bits];
      }
    }

    // The title is on top; its spaces let the picture shine through. Now
    // and then the wave garbles the letters it runs through.
    var glitching = hash(77, Math.floor(tick / C.titleGlitchWindow)) <
                    C.titleGlitchChance;
    for (x = 0; x < C.title.length && x < L.cols; x++) {
      var letter = C.title.charAt(x);
      if (letter === ' ') continue;
      if (glitching && waveRow(x) === C.centerRow &&
          hash(x + 11000, Math.floor(tick / 2)) < C.titleGlitchDensity) {
        var gc = C.titleGlitchChars;
        g[C.centerRow][x] = [gc.charAt(Math.floor(hash(x + 12000, tick >> 1) * gc.length)),
                             TILE_COLORS.wave];
      } else {
        g[C.centerRow][x] = [letter, ''];
      }
    }

    return g;
  }

  function render() {
    var g = compose(), out = [];
    for (var r = 0; r < C.rows; r++) {
      var line = '', cls = null, buf = '';
      for (var x = 0; x < L.cols; x++) {
        var cell = g[r][x];
        var ch = cell ? cell[0] : ' ';
        var k = cell ? cell[1] : null;
        if (k !== cls && buf) {
          line += cls ? '<span class="' + cls + ' r' + r + '">' + buf + '</span>' : buf;
          buf = '';
        }
        cls = k;
        buf += esc(ch);
      }
      if (buf) line += cls ? '<span class="' + cls + ' r' + r + '">' + buf + '</span>' : buf;
      out.push(line.replace(/\s+$/, ''));
    }
    el.innerHTML = out.join('\n');
  }

  function step() {
    tick++;
    phase += C.speed;
    if (tick % C.bitsEvery === 0) clockBit();
    if (tear.ticks === 0 && Math.random() < C.tearChance) {
      tear.row = C.centerRow;
      if (Math.random() < C.tearSpread) tear.row += Math.random() < 0.5 ? -1 : 1;
      tear.ticks = 2;
    }
  }

  // --- go ------------------------------------------------------------------

  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', C.title);
  layout();
  render();

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () { layout(); render(); }, 100);
  });

  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  window.setInterval(function () {
    if (document.hidden) return;
    step();
    render();
  }, C.tickMs);
})();
