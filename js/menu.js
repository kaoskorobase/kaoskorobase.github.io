/*
 * The menu: reveals the mail link (its address is only decoded here, so it
 * stays out of the page source), plays a short "running" animation and adds
 * the m / g / t keyboard shortcuts. The `theme` row cycles the colour themes
 * in css/themes/ (or `auto`, which follows the system's light/dark setting)
 * and remembers the choice in localStorage.
 */
(function () {
  'use strict';

  // 'auto' = no data-theme attribute: the CSS follows the system's light/dark
  // setting (cream or plum). The others are css/themes/<name>.css.
  var THEMES = ['cream', 'plum', 'classic', 'sequencer', 'auto'];
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

  var themeLink = document.querySelector('.menu a.theme');

  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  function themeLabel() {
    var t = root.dataset.theme;
    return t || 'auto (' + (dark && dark.matches ? 'plum' : 'cream') + ')';
  }

  function showTheme() {
    themeLink.parentNode.querySelector('.res').textContent = '\u2514 ' + themeLabel();
  }

  function nextTheme() {
    var i = THEMES.indexOf(root.dataset.theme || 'auto');
    var name = THEMES[(i + 1) % THEMES.length];
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

  if (themeLink) {
    showTheme();
    themeLink.parentNode.hidden = false;   // the row stays hidden without JS
    themeLink.addEventListener('click', function (e) { e.preventDefault(); nextTheme(); });
    if (dark && dark.addEventListener) dark.addEventListener('change', showTheme);
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
    if (e.key === 't' && themeLink) nextTheme();
  });
})();
