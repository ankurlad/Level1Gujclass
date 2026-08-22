# Akshar

A fully-offline PWA that teaches a 6–8 year old to write the 34 Gujarati consonants,
ક through જ્ઞ.

The child traces each letter stroke by stroke over a guide glyph, following numbered
waypoints in order; when the letter is finished there is confetti, a fanfare and points.
The points buy stickers. Four games (matching, quiz, phonics, memory) practise what the
tracing taught. A parent can look at progress, print worksheets and move the waypoints
themselves behind a gate the child is not supposed to walk through by accident.

Everything runs in the browser with no backend, no accounts and no network. The service
worker precaches the shell, the icons and the self-hosted fonts, so the app launches from
the home screen in an aeroplane exactly as it does on wifi. Nothing is sent anywhere —
progress, points, stickers and settings live in this browser's `localStorage` and nowhere
else.

Live at [level1gujclass.vercel.app](https://level1gujclass.vercel.app).

## Who it is for

- **The child (6–8).** Old enough to read the transliteration under a letter and to want a
  score rather than a unicorn. Younger than that and the transliteration is wasted; older
  and the reward economy is.
- **The parent.** Progress read-out, printable worksheets, sound and gate settings, and a
  reset. Behind the parent gate.
- **The teacher.** The waypoint editor and the JSON import/export, for correcting a
  letterform or teaching a stroke order the curriculum does not.

## Requirements

- **Node >= 22** — the pinned Vite 8.1.4 declares `engines: ^20.19.0 || >=22.12.0` and warns
  on anything older; CI runs 22.x. Use 22.12 or newer.
- **npm** — the repo has a `package-lock.json`; use `npm ci` for a reproducible install.

No other tooling is needed to develop or build. The two shell scripts in `scripts/` need
extra binaries, but only when you regenerate assets — see [Assets](#assets).

## Development

```bash
npm install       # npm ci in CI and for a clean checkout
npm run dev       # Vite dev server, http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve dist/ locally — the only way to exercise the service worker
```

`npm run dev` does not register the service worker, so install prompts, update prompts and
offline behaviour are not testable there. Use `npm run build && npm run preview` for those.

Note that the parent PIN needs a secure context: `crypto.subtle` exists on `https` and on
`localhost`, but not when you serve the built app over plain http at a LAN address. Both
the dev server and the preview server on localhost are fine; the app says so plainly rather
than falling back to something weaker.

### Scripts

| Script | What it does |
| :--- | :--- |
| `npm run dev` | Vite dev server with HMR. |
| `npm run build` | Production build to `dist/`, including the generated service worker and manifest. |
| `npm run preview` | Serves the built `dist/` — service worker included. |
| `npm run lint` | `oxlint src tests --max-warnings=8`, with a local plugin (`tools/oxlint-theme-plugin.js`) that fails the build on a raw hex colour in JSX. |
| `npm test` | Vitest, once. |
| `npm run test:watch` | Vitest in watch mode. |

### CI

`.github/workflows/ci.yml` runs on every pull request and on every push to `main`, on
Node 22.x: `npm ci`, then **lint** (oxlint), then **build** (`vite build`), then **test**
(Vitest — 363 tests across 10 files at the time of writing). A new push to a PR cancels the
run already in flight. There is no Lighthouse budget in CI yet; the sub-1s load claim in
`prd.md` is unenforced.

## Installing it on a phone

The app is deployed to Vercel; a push to `main` publishes it. From the phone:

1. Open the deployed URL in the browser.
2. **Android / Chrome:** take the install prompt the home screen offers, or use the browser
   menu (⋮) → *Install app*. **iOS Safari:** Share → *Add to Home Screen* (Safari never
   fires `beforeinstallprompt`, so the app shows these instructions instead of a button).
   **Desktop Chrome / Edge:** the install icon in the address bar.
3. Launch it from the home screen. It runs standalone, portrait, and works with the network
   off from that point on.

The service worker precaches the shell (JS, CSS, HTML), the icons and the four self-hosted
woff2 font subsets. Three runtime rules sit behind that precache:

- **`/assets/`** — CacheFirst for a year, 50 entries. Hashed build output: a hit is never
  stale, so the network is never worth asking. This is what will hold the recorded letter
  audio when it ships.
- **`fonts.googleapis.com` / `fonts.gstatic.com`** — CacheFirst, as a safety net only.
  Nothing in the app should ever reach Google; if a stylesheet regresses, this keeps the
  request from breaking the app offline.
- **Navigations** — NetworkFirst on a 3-second leash, falling back to the precached
  `index.html`. The shell is fetched rather than assumed, so a deploy is never one whole
  load stale.

Updates do not happen under the child. A new worker installs and then *waits*; it is
announced once, on the home screen, in the same card that offers the install, and it takes
over only when someone taps it (`registerType: 'prompt'` plus
`src/hooks/useServiceWorkerUpdate.js`).

## Repo layout

```
public/            Static, served as-is: fonts/ (4 self-hosted woff2 subsets + their
                   licence note), icons/ (192, 512, maskable-512), favicon.
src/
  App.jsx          Composition root: which view is on screen, the gate in front of it,
                   the nav bar under it. Nothing else.
  curriculum.js    The 34 letters — glyph, transliteration, phonics, example word, and
                   the waypoint array for each.
  index.css        The single palette: a Tailwind v4 @theme block of semantic tokens,
                   plus safe-area rules, the 44px touch-target floor and keyframes.
  components/      Chrome that is on screen whatever the view is: header, bottom nav,
                   parent gate, install and update cards.
  hooks/           useLocalStorage (namespacing + migration), usePwaInstall,
                   useServiceWorkerUpdate, useWaypointEditor.
  lib/             The headless parts: tracingEngine, waypoints (the path space), audio,
                   canvas, curriculumStorage, parentPin, stickers, theme.
  store/           appStore.js — the state more than one view touches, as one context.
  views/           One file per screen: HomeView, LessonMap, TraceView, GameZone,
                   SandboxView, StickerShop, ParentDashboard, WaypointEditor,
                   WorksheetsView.
tests/             Vitest. Unit tests for the engine, the path space, storage migration
                   and the PIN; jsdom tests that walk the real views through the real
                   nav controls; an a11y pass over the tokens.
scripts/           Bash utilities that regenerate committed assets. Not part of the build.
tools/             The oxlint plugin that bans hex literals in JSX.
```

## How the tracing works

A letter's stroke order is an array of numbered waypoints in a **0–100 path space**: each
coordinate is a percentage of the tracing box on both axes, `{ x: 50, y: 50 }` being dead
centre, multiplied by the logical canvas size (380×320) at draw time. Pixels appear only in
the drawing code — `src/lib/waypoints.js` owns the conversion, and a stored override with a
coordinate past 100 is recognised by shape as the pre-v2 pixel format and converted on read.
The judging is headless: `src/lib/tracingEngine.js` has no React and no DOM, so it is unit
tested without a browser. `createTracingSession(waypoints, opts)` takes pointer samples,
decides whether each one hits the next waypoint in sequence (radii are percent of the box
*width*, and the y axis is pre-scaled by the box aspect ratio, so tolerance is a circle on
screen and not an ellipse), and reports both a binary completion and an **accuracy** score —
`100 × max(0, 1 − meanDeviation / tolerance)`, where the deviation is measured against the
ideal polyline split at every pen lift, so dragging across a gap does not count as tracing
it. Completion says how much of the letter was drawn; accuracy says how neatly. Finishing a
letter awards 25 points plus a speed bonus, and the stickers in the shop cost 50 to 400.

## The parent gate — and what it is not

The gate is a modal in front of the dashboard and the waypoint editor, in one of two modes
(`guj:gate_type`):

- **Math** — a generated `a + b`, where a is 6–13 and b is 4–10. Sums of 10 to 23, which a
  7-year-old solves in their head. It is a speed bump against a curious tap, nothing more.
- **PIN** — a 4-digit passcode. There is no shipped default: the first parent to reach the
  prompt chooses one. Only a salted digest is stored — `{ algorithm, salt, hash }`, a
  per-install 16-byte salt and the SHA-256 of `salt:pin` via `crypto.subtle`
  (`src/lib/parentPin.js`). The dashboard can report that a passcode is set; it cannot show
  it.

**This is not a security boundary, and `prd.md` should not be read as claiming otherwise.**
The hashing removes cleartext from disk, which was a real defect; it does not make the gate
strong. Everything the gate protects is in `localStorage` on the same origin, readable and
writable from devtools in seconds, and 10,000 candidate PINs is an instant brute force for
anyone holding the storage. Treat it as a child-proof latch, not a lock.

### Where the state lives

Every persisted value goes through `src/hooks/useLocalStorage.js` under one `guj:`
namespace, JSON-encoded: `guj:points`, `guj:progress`, `guj:stickers`, `guj:brush_color`,
`guj:brush_width`, `guj:sound_enabled`, `guj:editor_mode`, `guj:install_dismissed`,
`guj:gate_type`, `guj:parent_pin_hash`, `guj:parent_unlock_all`, and one
`guj:custom_waypoints_<letterId>` per customised letter. `guj:version` records the schema
(currently 2); older keys are adopted lazily, per key, on first read. Because it is one
prefix, a whole install can be enumerated, exported or wiped in a loop — which is the
prerequisite for the multi-child profiles in Phase 5.

## Assets

### Icons

`bash scripts/generate-icons.sh` rebuilds `public/icons/` (192, 512 and a maskable 512 with
the art at 80% on the background teal) from `src/assets/icon-source.jpg`. Needs `ffmpeg`.

### Fonts

The four families are committed as woff2 subsets in `public/fonts/` and precached. There is
no runtime call to Google Fonts, and there must not be one: the guide letterforms the
waypoints are calibrated against have to be available offline. **Do not re-subset or
re-encode `noto-sans-gujarati-gujarati.woff2`** — the coordinates in `src/curriculum.js` are
calibrated against exactly what that file renders at 220px.

### Letter audio (not shipped yet)

Today the app speaks a letter through the Web Speech API with `lang: 'gu-IN'`, and falls
back to a Web Audio oscillator when no Gujarati voice is installed (`src/lib/audio.js`).
Most devices have no `gu-IN` voice, so the oscillator is what children actually hear. PR 10
in `IMPROVEMENTS.md` replaces this with 34 recorded clips; `scripts/tts-generate.sh` is
**not in the repo yet** and lands with that PR. The recipe it will run, if you need to
generate or regenerate the clips before then:

```bash
pip install edge-tts

# One clip per letter, into the folder the /assets/ runtime cache rule covers.
edge-tts --voice gu-IN-DhwaniNeural --text 'ક' --write-media ka.mp3
```

`gu-IN-DhwaniNeural` (female) and `gu-IN-NiranjanNeural` (male) are the two Gujarati voices
edge-tts offers; `edge-tts --list-voices | grep gu-IN` confirms them. Loop the 34 entries in
`src/curriculum.js`, keying each file by the letter's `id`. Keep the oscillator fallback in
place — a missing or unplayable clip must not leave a letter silent.

## Documentation

- **`prd.md`** — the product truth: features, personas, accessibility requirements,
  persistence contract, milestones. Update it in the same PR that changes a stated
  requirement.
- **`IMPROVEMENTS.md`** — the improvement backlog, PR by PR, with what shipped in each.

## Constraints worth knowing before you change anything

- **Offline is the product.** No runtime dependency on Google Fonts or any other third
  party. Self-host it and precache it.
- **The waypoints are calibrated to Noto Sans Gujarati.** A font change must keep the guide
  glyph visually identical or re-verify every letter's alignment.
- **WCAG 2.2 AA.** 44px touch targets (a base-layer floor in `index.css`, so nothing has to
  opt in), contrast >= 4.5:1, and never `user-scalable=no`.
- **One palette.** Semantic tokens in the `@theme` block are simultaneously CSS custom
  properties and utility classes; canvas code resolves the same tokens through
  `themeColor()`. A hex literal in JSX fails `npm run lint`.

## Licence

There is no licence file in this repository and `package.json` is marked `private`, so no
licence is granted — all rights reserved by default. If you intend this to be open source,
add a `LICENSE` at the root; this section is describing the repo as it stands, not making a
recommendation.

The bundled fonts are separately licensed: all four families are under the SIL Open Font
License 1.1, as recorded in `public/fonts/LICENSE.txt`.
