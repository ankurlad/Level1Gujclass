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
- **Universal Accessibility**: Maintain minimum 44x44px touch targets, high-contrast typography (>= 4.5:1 ratio), focus rings, and screen-reader ARIA semantics.
- **Safe Mobile Experience**: Protect settings and metrics behind parent verification locks (Math challenge / passcode gate).

---

## 3. User Personas

| Persona | Role | Primary Needs | Key Features Used |
| :--- | :--- | :--- | :--- |
| **Aarav (Age 5)** | Student Learner | Easy stroke guidance, instant audio feedback, fun rewards. | Tracing Canvas, Sticker Shop, Mini-Games |
| **Priya (Parent)** | Parent | Track child progress, lock app settings, control session flow. | Parent Dashboard, Security Gate, Progress Reset |
| **Meera (Educator)** | Language Teacher | Custom stroke waypoints, structured alphabet sequence. | Waypoint Editor, Phonics Guide, Akshar Path |

---

## 4. Feature Specifications

### 4.1 Interactive Tracing Engine
- **Canvas View**: 380x320 logical drawing space with touch and mouse event listeners (`touch-action: none`). The canvas backing store is sized to the rendered box times `devicePixelRatio` so the guide letter is not upscaled on high-DPI screens; waypoint coordinates, hit-test radii and brush widths all remain expressed in the 380x320 logical space.
- **Sequential Waypoint Snapping**: Guided numbered waypoints (1, 2, 3...) requiring sequential touch/drag validation within distance thresholds.
- **Completion Validation**: Tracing progress calculated via completed waypoints; triggers confetti particle animation and audio fanfare upon completion.

### 4.2 Curriculum & Phonics System
- **Consonants Dataset**: Comprehensive data for Gujarati consonants (`ક` through `જ્ઞ`) stored in [`curriculum.js`](file:///C:/Users/ankur/OneDrive/Documents/Projects/Level1Gujclass/src/curriculum.js#L1).
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
  `guj:` namespace (see 6.1).

### 4.5 Parent Dashboard & Waypoint Editor
- **Security Lock Gate**: Math problem verification (`num1 + num2`) or passcode check before entering management view. The passcode is stored only as a salted SHA-256 digest (see 6.1) — never in cleartext, and there is no shipped default: the first parent to reach the PIN prompt chooses one. The dashboard reports whether a passcode is set, it cannot show it.
- **Waypoint Editor**: Interactive tool to tweak, add, delete, or reset letter tracing waypoints.
- **JSON Import/Export**: Ability to copy/paste custom waypoint arrays for curriculum customization.

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
       └── lib/parentPin.js (Salted Passcode Digest)
```

- **Frontend Framework**: React 19
- **Build Tool**: Vite v8.1.4
- **PWA Service Worker**: Workbox via `vite-plugin-pwa`
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. There is one palette: the `@theme` block in `src/index.css` defines semantic tokens (`--color-primary`, `--color-reward`, `--color-success`, `--color-danger`, `--color-accent`) that are simultaneously CSS custom properties and utility classes. JSX carries no hex literals — `tools/oxlint-theme-plugin.js` fails the lint if one appears — and canvas code resolves the same tokens through `themeColor()`.
- **Icons**: Lucide React
- **Animations**: Canvas Confetti
- **Typography**: Noto Sans Gujarati, Baloo Bhai 2, Outfit and Fredoka, self-hosted as woff2 subsets in `/public/fonts` and precached by the service worker. There is no runtime call to Google Fonts or any other third party — the guide letterforms the waypoints are calibrated against must be available offline.

### 6.1 Persistence

Everything on disk goes through `src/hooks/useLocalStorage.js`. Component code does not call
`localStorage` directly.

- **One namespace**: every key is `guj:<name>` — `guj:points`, `guj:progress`, `guj:stickers`,
  `guj:brush_color`, `guj:brush_width`, `guj:sound_enabled`, `guj:editor_mode`,
  `guj:install_dismissed`, `guj:gate_type`, `guj:parent_unlock_all`, `guj:parent_pin_hash`, and one
  `guj:custom_waypoints_<letterId>` per customised letter. A whole install can be enumerated,
  exported or wiped by prefix, which is the prerequisite for multi-child profiles (Phase 5).
- **One encoding**: values are JSON, so read and write are a single pair of rules.
- **Versioned**: `guj:version` records the schema the store was last written by. Version 1 is the
  namespaced, JSON, hashed-passcode shape; version 0 is the pre-namespace `guj_*` store. A key
  written by an older version is adopted on first read — the old key is deleted and the new one
  written in the same step — so migration is lazy, per key, and safe to interrupt. Bump the version
  when a stored *value* shape changes.
- **No cleartext passcode**: `guj:parent_pin_hash` holds `{algorithm, salt, hash}` — a per-install
  16-byte salt and the SHA-256 of `salt:pin` via `crypto.subtle`. This needs a secure context
  (https or localhost); serving the built app over plain http on a LAN address cannot set or check a
  passcode and says so.

---

## 7. Release Milestones & Status

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Core Canvas Tracing Engine & Curriculum Data | ✅ Completed |
| **Phase 2** | Game Zone (Match, Quiz, Phonics, Memory) & Rewards | ✅ Completed |
| **Phase 3** | Parent Dashboard & Custom Waypoint Editor | ✅ Completed |
| **Phase 4** | Mobile-First Safe-Area & WCAG 2.2 AA Accessibility Audit | ✅ Completed |
| **Phase 5** | Vowels (Swar) Expansion & Multi-Child Profiles | ⏳ Planned |
| **Phase 6** | Android TWA & Google Play Store Packaging | ⏳ Planned |

---

## 8. Success Metrics

- **Offline Cache Reliability**: 100% launch capability without network connectivity.
- **Accessibility Pass Score**: 0 WCAG 2.2 AA violations in automated lighthouse/axe audits.
- **Performance**: Sub-1-second initial load time on 3G network connections.
- **Usability**: Zero touch target collision errors on mobile screens (viewport 360px–480px).
