/*
 * The menu: reveals the mail link (its address is only decoded here, so it
 * stays out of the page source), plays a short "running" animation and adds
 * the m / g / t keyboard shortcuts. The icon-only toggle button switches
 * dark / light / auto and remembers the choice in localStorage.
 */
(function () {
  'use strict';

  // The toggle offers dark (plum), light (cream) and auto. 'auto' = no
  // data-theme attribute: the CSS follows the system's light/dark setting.
  // Other themes in css/themes/ still work via data-theme but are not offered.
  // The cycle starts with the opposite of the system setting, then the same
  // as the system, then auto.
  var ICONS = { plum: 'i-moon', cream: 'i-sun', auto: 'i-auto' };
  var NAMES = { plum: 'dark', cream: 'light', auto: 'auto (follows system)' };
  var root = document.documentElement;
  var rows = [].slice.call(document.querySelectorAll('.menu .tool'));
  var mail = document.querySelector('.menu a.mail');
  var github = document.querySelector('.menu a.gh');

  function rot13(s) {
    return s.replace(/[a-z]/gi, function (c) {
      var base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
    });
  }

  if (mail) {
    mail.href = 'mailto:' + rot13('xnbfxbebonfr@tznvy.pbz');
    mail.parentNode.hidden = false;      // the row stays hidden without JS
  }

  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  var toggle = document.querySelector('.theme-toggle');

  function showTheme() {
    var t = root.dataset.theme;
    if (!ICONS[t]) t = 'auto';
    var label = 'Colour theme: ' + NAMES[t];
    toggle.querySelector('use').setAttribute('href', '#' + ICONS[t]);
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  function nextTheme() {
    var sysDark = !!(dark && dark.matches);
    var cycle = sysDark ? ['cream', 'plum', 'auto'] : ['plum', 'cream', 'auto'];
    var i = cycle.indexOf(root.dataset.theme || 'auto');   // other themes -> first
    var name = cycle[(i + 1) % cycle.length];
    try {
      if (name === 'auto') {
        root.removeAttribute('data-theme');
        window.localStorage.removeItem('theme');
      } else {
        root.dataset.theme = name;
        window.localStorage.setItem('theme', name);
      }
    } catch (e) {}
    showTheme();
  }

  if (toggle) {
    showTheme();
    toggle.hidden = false;                 // the button stays hidden without JS
    toggle.addEventListener('click', nextTheme);
  }

  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    var frames = ['|', '/', '-', '\\'], n = 0;
    var visible = rows.filter(function (r) { return !r.hidden; });
    visible.forEach(function (r) { r.classList.add('pending'); });
    visible.forEach(function (r, i) {
      var spin = r.querySelector('.spin');
      window.setTimeout(function () {
        var t = window.setInterval(function () {
          spin.textContent = ' ' + frames[n++ % frames.length];
        }, 90);
        window.setTimeout(function () {
          window.clearInterval(t);
          r.classList.remove('pending');
        }, 650);
      }, 300 + i * 900);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'm' && mail) mail.click();
    if (e.key === 'g' && github) github.click();
    if (e.key === 't' && toggle) nextTheme();
  });
})();
