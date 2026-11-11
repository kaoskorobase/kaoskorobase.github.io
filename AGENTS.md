# AGENTS.md

One-page site for www.declaredvolatile.org: an animated ASCII logo and a
two-line contact menu styled like coding-agent output. Plain HTML, CSS and JS
served by GitHub Pages from `main`. No build step, no dependencies, no
third-party requests.

```
index.html     page, static fallback logo, menu markup, SVG icon sprite
css/site.css   layout and structure; every colour is a variable
css/themes/    one file per colour theme (cream, plum, classic, sequencer)
js/logo.js     animated logo (configured by CONFIG at the top)
js/menu.js     menu: mail decode, "running" animation, theme switcher, m/g/t keys
CNAME          custom domain; do not delete or edit
```

Work on a branch and open a PR; merging to `main` deploys.

## Constraints

- **HTTPS only.** An `http://` sub-resource is blocked on the HTTPS page and
  fails silently. System fonts only; nothing is fetched from other origins.
- **The logo is a character grid and needs a monospace font** with one column
  per character. Keep `glitchChars`, `titleGlitchChars` and markup to
  single-width characters (ASCII, box drawing). No emoji.
- **Logo and menu share one font size**, set on `body` in `css/site.css` and
  inherited. The logo handles narrow screens by changing its picture (below),
  not its font size. If you add responsive font sizes, `logo.js` still adapts
  (it measures the real character width and available width on every resize),
  but check the `min-height` note below.
- **No hardcoded colours** in `site.css`, `logo.js` or `menu.js`. Colours
  come from theme variables (see Themes), so every theme can restyle
  everything.
- **The mail address is not in the HTML.** `js/menu.js` decodes it from rot13
  at runtime to keep it from scrapers. Do not paste the address or a `mailto:`
  into `index.html`.
- **Must work without JS:** the static logo and the github row show; the mail
  row is `hidden` until `menu.js` reveals it.
- **Respect `prefers-reduced-motion`:** `logo.js` renders one still frame,
  `menu.js` skips the spinner, the cursor stops blinking.

## CSS notes

- `.home` (link around the logo) must stay `display:block`. As `inline-block`
  its baseline is the last text line, so the menu below shifts by a few pixels
  whenever the animation's bottom row is empty.
- `.logo { min-height:6em }` = `rows` (5) x `line-height` (1.2). Change one,
  change the other, or the page jumps when JS takes over.
- `logo.js` sizes itself from the body's content width, so changing the page
  padding automatically changes the logo's width.

## Themes

`css/site.css` only uses variables (`--bg`, `--fg`, `--link`, `--link-strong`,
`--link-hover`, `--title`, `--wave`, `--digit`, `--icon`, `--accent`, `--dim`,
`--scheme`). A theme file `css/themes/<name>.css` sets them under
`:root[data-theme="<name>"]`. Optional variables have fallbacks:
`--wave-0..4` (colour per logo row, falls back to `--wave`), `--icon-1..3`
(per menu row, falls back to `--icon`), `--wave-shadow` / `--digit-shadow`
(default none).

- **Themes:** `cream` (light), `plum` (dark), `classic` (the original light
  scheme), `sequencer` (near-black, rows coloured like drum tracks). The
  palette comes from the kaoskorobase-avatar repo.
- **`auto`** is the default: no `data-theme` attribute, so the CSS follows the
  system setting: cream for light, plum for dark. Those two default rules live
  in `cream.css` and `plum.css` inside mutually exclusive media queries
  (`not all and (prefers-color-scheme: dark)` and `(prefers-color-scheme:
  dark)`), so the order of the `<link>` tags does not matter. Each of those two
  files therefore lists its variables twice; keep the two blocks identical.
- **Choosing:** the `theme` menu row (or `t`) cycles `THEMES` in `menu.js`
  (cream, plum, classic, sequencer, auto), sets `data-theme` and stores it in
  `localStorage['theme']`; `auto` removes both. A script in the `<head>` of
  `index.html` applies the stored name before first paint and drops it if no
  such theme exists.
- **Adding a theme:** create `css/themes/<name>.css`, add a `<link>` for it in
  `index.html`, add the name to `THEMES` in `menu.js`. Aim for 4.5:1 contrast
  for text and 3:1 for decorative glyphs against the theme's `--bg`.
- `logo.js` tags every coloured run with `curve` or `digit` plus its row
  (`r0`..`r4`); that is what the per-row variables hook into. The static logo
  in `index.html` has no row classes, so without JS it takes the base colours.

## Logo

**The static logo is the ground truth.** The logo inside `<div id="logo">` in
`index.html` defines how the logo looks. It is hand-kept, not generated. It is
what visitors see without JS and briefly before `logo.js` runs; `logo.js` is
an animated interpretation of it and replaces it when it runs.

- **Do not edit the static logo on your own initiative**, and do not
  regenerate it from the animation. Change it only when the user explicitly
  asks, or after asking the user.
- When you change the animation, keep it recognisably the same logo. If it has
  drifted significantly from the static one, tell the user and ask which side
  should change, rather than silently updating the static copy.
- The two need not match exactly, only look like the same logo.

### Animation (`js/logo.js`)

A computed sine wave travels right, shrinks towards "volatile", dissolves into
a glitch tail along the axis and ends in a shifting stream of bits. Sometimes
it garbles letters of the title and the axis line "tears". Read the header
comment for the picture and `CONFIG` for every tunable value (all commented).

How it is organised: `layout()` derives the geometry `L`; `compose()` builds a
`rows x cols` grid of `[char, class]` from layers (wave and fragments, dust,
tear, bits, title on top; the title's spaces are transparent); `render()`
writes it as `<span class="curve|digit">` runs; a `setInterval` runs
`step()` + `render()`. Fragment randomness is a deterministic `hash()` keyed by
position and a time slot, so fragments travel with the wave and re-roll every
`holdTicks` ticks.

### Screen size handling

`layout()` runs on load and (debounced) on resize/rotation. It measures the
character width and the body's content width and derives:

- `cols` = what fits, clamped to `minCols..maxCols` (22..38);
- `dissolveFrom` = `dissolveAt * cols`, so narrow screens start the tail
  earlier; the tail ends at the last column;
- `bitsLength` = half of the space after the title, clamped to `3..bitsMax`.

Roughly: 1280 px gives 38 columns and 10 bits, 390 px gives 32 and 7, 320 px
gives 24 and 3. The 17-character title always fits.

### Things to know when tuning

- `speed` must be a whole number; fractional values make the wave's shape
  pulse from frame to frame.
- `scatter`, the tear and the speckles are deliberately confined to the axis
  +/- 1 row. On rows 0 and 4 they look like stray lines far from the wave.
- `ampTo` is in absolute columns (it follows the title length, not the width).
- Changing `rows` or `centerRow` also means updating `.logo`'s `min-height`.

### Refreshing the static logo

Only when the user asks to refresh the static logo from the animation: capture
frame 0 (the synchronous first render) at a 32-column width, e.g. in Playwright:

```python
page = browser.new_page(viewport={'width': 390, 'height': 800})
page.add_init_script("window.setInterval = function(){ return 0 }")  # freeze
page.goto('file:///.../index.html')
html = page.inner_html('#logo')   # paste inside <div id="logo" class="logo">
```

## Menu

Each link is a `.tool` row in `<nav class="menu">`: an `<a>` with an icon, a
`.spin` span and a `.res` result line. Icons are `currentColor` SVG
`<symbol>`s in the sprite at the top of `<body>` (GitHub mark from Octicons,
MIT). To add a link: add a symbol and a `.tool` row, and a key in `menu.js` if
wanted. Result lines show the destination without repeating the handle. The `theme`
row is hidden until `menu.js` reveals it (it needs JS); its result line shows
the current theme, e.g. `auto (plum)`.

## Testing

No test suite; use a real browser engine (headless Chrome via Playwright
works). Check at 320, 360, 390, 844x390 (landscape phone) and 1280, with JS
on and off:

- no horizontal overflow (`scrollWidth <= innerWidth`) and no `pageerror`;
- `#logo` and `.menu` have the same computed `fontSize`;
- the menu's top edge takes exactly one value over a few hundred frames;
- the widest logo line equals `cols` for that width, and the tail has no
  glitch characters on rows 0 and 4;
- with JS off, the static logo and the github row show;
- with the system set to light and to dark (Playwright `color_scheme`), `auto`
  gives cream and plum respectively, with and without JS, and every theme
  in `THEMES` can be cycled through without console errors.

A screenshot is one random frame of the animation; sample many frames before
judging it.
