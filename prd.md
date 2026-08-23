# Product Requirement Document (PRD)

## Akshar Gujarati Learner PWA

**Document Version:** 1.3  
**Status:** Approved / Active  
**Author:** Antigravity AI & Level1Gujclass Team  
**Last Updated:** July 2026  

---

## 1. Executive Summary

**Akshar Gujarati Learner PWA** is a progressive web application designed for young children (ages 3–8) and diaspora families learning the Gujarati language. The application combines interactive canvas-based stroke tracing, native Web Speech TTS, Web Audio API sound synthesis, and gamified reward systems to make learning Gujarati consonants intuitive, accessible, and enjoyable.

Built with React 19, Vite, and Workbox PWA technology, the application operates 100% offline, adheres strictly to mobile-first responsive layout standards, and complies with WCAG 2.2 AA accessibility guidelines.

---

## 2. Product Goals & Objectives

- **Gamified Learning**: Motivate young learners through interactive tracing, instant audio-visual feedback, earned points, and a collectible Sticker Shop.
- **Stroke Accuracy**: Guide letter formation using sequential, numbered waypoints with real-time distance-snapping algorithms.
- **Offline Reliability**: Ensure 100% functionality without internet connectivity via PWA service worker caching.
- **Updates on the child's terms**: a new service worker installs and then waits. It is announced once, on the home screen, through the same card that offers the install, and it only takes over when someone taps it — never mid-lesson.
- **Universal Accessibility**: Maintain minimum 44x44px touch targets, high-contrast typography (>= 4.5:1 ratio), focus rings, and screen-reader ARIA semantics.
- **Safe Mobile Experience**: Protect settings and metrics behind parent verification locks (Math challenge / passcode gate).

---

## 3. User Personas

| Persona | Role | Primary Needs | Key Features Used |
| :--- | :--- | :--- | :--- |
| **Aarav (Age 5)** | Student Learner | Easy stroke guidance, instant audio feedback, fun rewards. | Tracing Canvas, Sticker Shop, Mini-Games |
| **Priya (Parent)** | Parent | Track child progress, lock app settings, control session flow. | Parent Dashboard, Parent Gate, Progress Reset |
| **Meera (Educator)** | Language Teacher | Custom stroke waypoints, structured alphabet sequence. | Waypoint Editor, Phonics Guide, Akshar Path |

---

## 4. Feature Specifications

### 4.1 Interactive Tracing Engine
- **Canvas View**: 380x320 logical drawing space with touch and mouse event listeners (`touch-action: none`). The canvas backing store is sized to the rendered box times `devicePixelRatio` so the guide letter is not upscaled on high-DPI screens; ink coordinates, hit-test radii and brush widths are expressed in the 380x320 logical space.
- **Waypoint Path Space**: Waypoint coordinates are *not* pixels. Each is a percentage of the tracing box — `0`..`100` on both axes, `{ x: 50, y: 50 }` being dead centre — and is multiplied by the current logical canvas size at draw time (`src/lib/waypoints.js`). Resolution is hundredths of the box. This is the format of the curriculum data, of a saved `guj:custom_waypoints_<letterId>` override and of the editor's JSON import/export alike.
- **Sequential Waypoint Snapping**: Guided numbered waypoints (1, 2, 3...) requiring sequential touch/drag validation within distance thresholds.
- **Completion Validation**: Tracing progress calculated via completed waypoints; triggers confetti particle animation and audio fanfare upon completion.

### 4.2 Curriculum & Phonics System
- **Consonants Dataset**: Comprehensive data for Gujarati consonants (`ક` through `જ્ઞ`) stored in [`curriculum.js`](file:///C:/Users/ankur/OneDrive/Documents/Projects/Level1Gujclass/src/curriculum.js#L1) as `CONSONANTS`.
- **Vowels Dataset**: The 8 vowels (`અ` through `ઌ`) in the same file as `VOWELS`, each with a generated waypoint path and a `learningViews` sequence — the ordered list of existing app views a child works through to master one letter (trace, say, match, recall, practise). `CURRICULUM` is the two concatenated, consonants first, because the lesson lock chain is by index.
- **Phonics & Transliteration**: English pronunciations, phonics helper guide, and associated vocabulary words with emojis (e.g., ક - કમળ / Lotus / 🪷).
- **Speech Synthesis**: Web Speech API (`window.speechSynthesis`) for native letter audio playback; Web Audio API oscillator fallback.

### 4.3 Interactive Game Zone
- **Matching Game**: Drag-and-drop / select letter-to-picture matching cards.
- **Alphabet Quiz**: Multiple-choice letter identification quizzes.
- **Phonics Audio Challenge**: Listen to pronunciation and pick the correct letter.
- **Memory Match**: Card flipping memory game for visual recognition.
- **Creative Sandbox**: Freehand drawing canvas with color palette selection.

### 4.4 Rewards & Points Economy
- **Points Ledger**: Earn +10 points per completed tracing exercise.
- **Sticker Shop**: Purchase collectible stickers (`Lion`, `Monkey`, `Unicorn`, `Rocket`, `Panda`, `Watermelon`) using accumulated points.
- **Local Persistence**: Purchases and progress persisted in browser `localStorage` under the single
  `guj:` namespace (see 6.1), per child (see 6.3) — the points a child earns and the stickers they
  buy are theirs, not the device's.

### 4.5 Parent Dashboard & Waypoint Editor
- **Parent Verification Lock**: Math problem verification (`num1 + num2`) or passcode check before entering management view. This is a child-proof latch, not a security boundary: everything behind it sits in `localStorage` on the same origin, readable and writable from devtools, and 10,000 candidate PINs is an instant brute force for anyone holding the storage. The passcode is stored only as a salted SHA-256 digest (see 6.1) — never in cleartext, and there is no shipped default: the first parent to reach the PIN prompt chooses one and confirms it in a second field, and nothing is stored unless the two agree. The dashboard reports whether a passcode is set, it cannot show it; it can change or remove that passcode, and both actions require the current one first.
- **Waypoint Editor**: Interactive tool to tweak, add, delete, or reset letter tracing waypoints.
- **JSON Import/Export**: Ability to copy/paste custom waypoint arrays for curriculum customization. Export writes the live array; **Load JSON** reads a pasted block back in, and applies it only if the whole block passes the schema in 6.2. A refused paste names the entry that broke it in a `role="alert"` line under the box, leaves the letter on screen exactly as it was, and leaves the text in the box to be corrected. A block still in the pre-v2 pixel range is converted, not refused, and the same line says so. Loading changes the session; **Save Waypoints** is still what writes to the device.

---

## 5. Non-Functional Requirements

### 5.1 Mobile Layout & Safe-Area Support
- **Viewport Fit**: Enforced `viewport-fit=cover` in `index.html`.
- **Zoom**: The viewport meta carries only `width=device-width, initial-scale=1.0, viewport-fit=cover`.
  `maximum-scale` and `user-scalable=no` must never be reintroduced — pinch-zoom is WCAG 1.4.4.
- **Notch Padding**: Dynamic padding using CSS `env(safe-area-inset-top)` on sticky headers, `env(safe-area-inset-bottom)` on navigation bars, and `env(safe-area-inset-left/right)` on `#root`.
- **Responsive Bounds**: Bounded mobile container (`max-width: 480px`) centered on tablet and desktop screens.

### 5.2 Accessibility (WCAG 2.2 AA)
- **Touch Target Minimums**: All buttons, links, inputs, and interactive elements strictly meet `44x44px` minimum sizing. The floor is a single base-layer rule in `index.css` (`min-width`/`min-height: 44px` on `button, select, textarea, a, input`), so no control has to opt in; a `min-w-*`/`min-h-*` utility below 44px is the only thing that can undercut it.
- **Color Contrast**: All text elements maintain a minimum contrast ratio of `4.5:1` against background surfaces (muted text is `text-slate-500`; `slate-400` is never used for text, it does not clear 4.5:1 on white).
- **Light Fills Take Dark Labels**: `--color-reward`/amber and `--color-success`/emerald are too light for a white label at any step on their ramps (2.15:1 and 2.54:1), so those surfaces carry `text-ink` instead. Indigo, rose and purple keep white labels at the 600/700 steps. `pink-500` only clears 3:1, so it is limited to large text (the app logo glyph).
- **Focus Indicators**: Visible `:focus-visible` outline rings (`3px` of `--color-primary-tint` at 60%, `offset 2px`).
- **Semantic HTML**: Structural hierarchy using `<header>`, `<main>`, `<nav aria-label="Main Navigation">`, and explicit `aria-label` / `aria-current` states.

### 5.3 Failure Containment
- **One boundary per screen**: each of the eight view branches in `src/App.jsx` (home, letter map, tracing, games, drawing, sticker shop, parents room, worksheets) is wrapped in its own `ErrorBoundary` (`src/components/ErrorBoundary.jsx`). React unmounts to the root when nothing catches a render error, so without this one broken screen takes the header, the nav bar and the other seven with it and leaves a child on a blank page.
- **What the child sees**: a card reading *"Something went wrong loading this screen"*, the line that nothing was lost, and a **Try again** button that remounts that screen's subtree (a re-render would hand the same state back to the same error). The card is `role="alert"`. The error and the name of the screen go to the console; neither reaches the card, because nobody can act on a stack trace.
- **No blank screen as a design point**: the boundary is the backstop, not the plan. Nothing on the storage or input paths in 6.2 throws — a bad value is corrected, dropped or refused with a message, so reaching the card at all means a genuine bug.

---

## 6. System Architecture & Tech Stack

```
[Browser Client]
  ├── index.html (PWA Meta & Viewport Fit)
  └── src/
       ├── main.jsx (React DOM Mount)
       ├── index.css (@theme Design Tokens, Safe Areas, Touch Targets, A11y)
       ├── App.jsx (State Engine, Tracing, Games, Dashboard)
       ├── curriculum.js (Letter Data & Waypoints)
       ├── hooks/useLocalStorage.js (Namespaced Persistence & Schema Migration)
       ├── lib/childProfiles.js (Child Profiles: Which Keys Are Whose, & The Migration)
       └── lib/parentPin.js (Salted Passcode Digest)
```

- **Frontend Framework**: React 19
- **Build Tool**: Vite v8.1.4
- **PWA Service Worker**: Workbox via `vite-plugin-pwa`, `generateSW` mode. The precache (16 entries) holds the shell, the four self-hosted font subsets and the three icons. Three runtime rules sit behind it: `/assets/` CacheFirst for a year (50 entries), a CacheFirst safety net for `fonts.googleapis.com` / `fonts.gstatic.com` that nothing should ever hit, and navigations NetworkFirst on a 3s leash falling back to the precached `index.html`. The shell is fetched, not assumed, so a deploy is never one load stale.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. There is one palette: the `@theme` block in `src/index.css` defines semantic tokens (`--color-primary`, `--color-reward`, `--color-success`, `--color-danger`, `--color-accent`) that are simultaneously CSS custom properties and utility classes. JSX carries no hex literals — `tools/oxlint-theme-plugin.js` fails the lint if one appears — and canvas code resolves the same tokens through `themeColor()`.
- **Icons**: Lucide React
- **Animations**: Canvas Confetti
- **Typography**: Noto Sans Gujarati, Baloo Bhai 2, Outfit and Fredoka, self-hosted as woff2 subsets in `/public/fonts` and precached by the service worker. There is no runtime call to Google Fonts or any other third party — the guide letterforms the waypoints are calibrated against must be available offline.

### 6.1 Persistence

Everything on disk goes through `src/hooks/useLocalStorage.js`. Component code does not call
`localStorage` directly.

- **One namespace**: every key is `guj:<name>`. Device-wide: `guj:children`, `guj:active_child`,
  `guj:brush_color`, `guj:brush_width`, `guj:sound_enabled`, `guj:editor_mode`,
  `guj:install_dismissed`, `guj:gate_type`, `guj:parent_unlock_all`, `guj:parent_pin_hash`, and one
  `guj:custom_waypoints_<letterId>` per customised letter. Per child: `guj:child:<id>:points`,
  `guj:child:<id>:progress` and `guj:child:<id>:stickers` — see 6.3. A whole install can be
  enumerated, exported or wiped by prefix, and one child can be, by the longer prefix.
- **One encoding**: values are JSON, so read and write are a single pair of rules.
- **Versioned**: `guj:version` records the schema the store was last written by. Version 3 keeps the
  three per-child values under `guj:child:<id>:`; version 2 stores waypoint overrides in the 0-100
  path space with every value still device-wide; version 1 is the namespaced, JSON, hashed-passcode
  shape with waypoints still in canvas pixels; version 0 is the pre-namespace `guj_*` store. A key
  written by an older version is adopted on first read — the old key is deleted and the new one
  written in the same step — so migration is lazy, per key, and safe to interrupt. Bump the version
  when a stored *value* shape changes, or when a key moves.
- **Waypoint overrides carry their own format tag**: the v1 -> v2 conversion keys off the value, not
  off `guj:version` — a coordinate past 100 in either axis can only be pixels, since a letterform in
  path space never reaches the edge of the box. Detection by shape makes the conversion idempotent
  and correct for a store whose version key was lost. The override is schema-checked (6.2) before
  either conversion or use.
- **Nothing on disk is trusted**: a `guj:` key is a text file on someone else's device, so every
  value is validated on the way out of storage as well as on the way in — see 6.2. A stored value
  the app cannot use is corrected, or dropped and logged, never handed to a view.
- **No cleartext passcode**: `guj:parent_pin_hash` holds `{algorithm, salt, hash}` — a per-install
  16-byte salt and the SHA-256 of `salt:pin` via `crypto.subtle`. This needs a secure context
  (https or localhost); serving the built app over plain http on a LAN address cannot set or check a
  passcode and says so. It is a **device** key: one gate for the whole device, unaffected by which
  child is playing (6.3).

### 6.2 Input & Storage Validation

Every value that enters state from somewhere the app does not control — a text input, a pasted
textarea, or a `guj:` key written by an older build, another tab or devtools — is checked by one
module, `src/lib/validate.js`. **No silent data loss and no silent acceptance**: each boundary below
either accepts the value, or corrects it and logs what it did, or refuses it and says which field
failed. Nothing is dropped without a record, nothing bad is taken quietly, and nothing throws.

| Value | Boundary | Rule | What happens |
| :--- | :--- | :--- | :--- |
| `guj:points` | read + every write | finite number, clamped to `0..999999` | out-of-range clamps, non-numeric starts at 0, both `console.warn`; the corrected value replaces the bad one on disk |
| `guj:stickers` | read + every write | array of ids the catalogue in `src/lib/stickers.js` actually has, each once | bad and repeated entries are dropped one at a time and logged, the rest are kept — an unlocked sticker is never discarded because a neighbour was junk, and the dashboard count can no longer claim more than it draws |
| `guj:children` | read | array of `{id, name, ...}`, ids unique, at most 8, names 1-16 chars | a profile that is not usable is dropped and logged; its `guj:child:<id>:*` keys are left on disk, because dropping the index is not deciding the data is worthless |
| A new child's name | keystroke + submit | 1-16 characters after whitespace collapse, not a name already on the device | refused with the reason in a `role="alert"` line in the switcher; nothing is created |
| `guj:brush_width` | read | finite number, clamped to `1..64` | clamped or reset to 16, logged; the value reaches `ctx.lineWidth` directly |
| `guj:custom_waypoints_<letterId>` | read | the waypoint schema below | a bad override is ignored with the reason logged and the letter falls back to its calibrated default; the key is left on disk, because it is the only copy of what the parent recorded |
| Parent passcode fields (gate first run, dashboard set/change/remove) | keystroke + submit | field holds digits only, max 4; exactly 4 digits to be accepted | a non-passcode never reaches `crypto.subtle`; the reason is one `role="alert"` line under the fields |
| Math gate answer | submit | whole number | a field that does not hold a number is told so and keeps the same sum on screen, instead of being handed a new one as if the arithmetic were wrong |
| Waypoint editor **Load JSON** textarea | Load JSON | parses, is an array, ≥ 2 points, the schema below | applied whole or not at all; the specific failure is a `role="alert"` line and the previous letter is untouched (4.5) |

**The waypoint schema** (as of PR 5, validated as of PR 12): an array of objects, each with finite
numeric `x` and `y`, an optional `label` that is a whole number above 0 (as a number or a digit
string), and an optional `moveTo` that is a boolean. A rejection names the entry — *"Point at index
1: x is 4000, outside the 0-380 pre-v2 pixel range."*

Range is checked against the space the data is written in, not against a literal 100: a coordinate
past 100 means the block is the pre-v2 pixel format, so it is range-checked against the 380x320 box
and then converted by `normalizeWaypoints`. It is never clamped — clamping a stale export would
import the letterform crushed against the right and bottom edges of the box, which is a letter that
looks fine in the editor and cannot be traced.

### 6.3 Multi-Child Profiles

One device, more than one child. Before this, every persisted value was device-wide, so two children
on the same tablet shared one points ledger, one sticker shelf and one set of completed letters — the
second child started at the first one's score and could not earn anything the first one had already
bought.

- **The list**: `guj:children` holds `[{ id, name, avatar, createdAt }]`, and `guj:active_child`
  names the one playing. A device keeps at most 8; a name is 1–16 characters, whitespace-collapsed,
  and must not repeat one already on the device. `src/lib/childProfiles.js` owns the shape and
  `sanitizeChildren` in `src/lib/validate.js` is its boundary — a profile the app cannot draw is
  dropped and logged like a bad sticker id, and its `guj:child:<id>:*` keys are **left on disk**
  rather than deleted, because dropping the index is not the same as deciding the data is worthless.
- **What is per child**: `points`, `progress` (traced count, quiz score, completed letters) and
  `stickers` — everything a child *earned*. They live at `guj:child:<id>:<key>`, still through
  `useLocalStorage`, so the namespace, the JSON encoding, the version stamp and the 6.2 validate
  guard all still apply. The key is what changes when a child switches; there is no second copy of a
  ledger to keep in step.
- **What is device-wide, and why**: the passcode digest and the gate type (one gate for the device —
  per-child passcodes would mean the gate asks a different question depending on who last used the
  tablet, and switching child would be a way past whichever one was in force); unlock-all (a
  parental control, not an earning); **brush colour, brush width and sound (device defaults for
  v1 — a child does pick these, so there is an argument for scoping them, but they are preferences
  and not progress, nothing is lost when the other child changes one, and per-child sound is a
  setting a parent expects to set once for the room. Moving them later is one line plus a
  migration)**; editor mode; install dismissal; and the waypoint overrides (a corrected letterform
  is a curriculum improvement — the parent who fixes ક's stroke order fixes it for every child).
- **The migration is lossless and idempotent**. On the first boot after the update, an implicit child
  `c1` named *Child 1* is created and the three legacy device-wide keys become that child's. The old
  decode rules are not re-implemented: `readStored` reads the old key, so a v0 `guj_points` holding
  the bare string `250` is adopted, parsed and deleted by exactly the code that has always done
  that, and only then does the value move — two hops in one boot, once ever. The child key is
  written *before* the old key is removed. After a complete run there is no legacy key left to find,
  so a second boot writes nothing (the tests compare the whole store dump across two mounts). A run
  interrupted half way resumes on the next boot, because the list is written before the sweep and
  the implicit child's id is a constant. A legacy key that survives next to a child key that already
  has a value is dropped rather than moved, with a `console.warn` — the child's own value is the
  newer one. The trigger is the absence of `guj:children`, not `guj:version`, for the same reason
  the v2 conversion keys off the coordinate range: the store's own shape is the more reliable signal.
- **Switching child is not an unlock**. It writes `guj:active_child` and nothing else, and returns to
  the home screen. The gate has never had an "unlocked for this session" flag — it re-challenges on
  every entry — and the passcode is not in the per-child set, so no switch can clear it, replace it
  or step around it.
- **Where the UI is**: a switcher in the header brand area (avatar, name, a popover listing every
  child with the active one checked, and *New child* with a name field — every target 44px). It is
  deliberately *not* behind the gate: handing the tablet to a sibling is not a parental setting, and
  a gate there would mean a parent has to be in the room before the other child can start. The
  parents' room gains a **Children** panel listing each child with a per-child reset; the reset
  clears only that child's three keys, and asks for the passcode again where one is set (the Danger
  Zone button at the foot of the page opens the same flow rather than a second, weaker one).

---

## 7. Release Milestones & Status

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Core Canvas Tracing Engine & Curriculum Data | ✅ Completed |
| **Phase 2** | Game Zone (Match, Quiz, Phonics, Memory) & Rewards | ✅ Completed |
| **Phase 3** | Parent Dashboard & Custom Waypoint Editor | ✅ Completed |
| **Phase 4** | Mobile-First Safe-Area & WCAG 2.2 AA Accessibility Audit | ✅ Completed |
| **Phase 5** | Vowels (Swar) Expansion & Multi-Child Profiles | ✅ Multi-child profiles (6.3); 8 vowels અ-ઌ with generated waypoints, learning sequences and recorded audio (13a2) |
| **Phase 6** | Android TWA & Google Play Store Packaging | ⏳ Planned |

---

## 8. Success Metrics

- **Offline Cache Reliability**: 100% launch capability without network connectivity.
- **Accessibility Pass Score**: 0 WCAG 2.2 AA violations in automated lighthouse/axe audits.
- **Performance**: Sub-1-second initial load time on 3G network connections.
- **Usability**: Zero touch target collision errors on mobile screens (viewport 360px–480px).
