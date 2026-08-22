# Level1Gujclass — Improvement Backlog (extracted from claude.ai review thread)

Source: claude.ai chat "Improving Level1Gujclass repository" (Aug 2026, reviewed against the live repo).
Repo: github.com/ankurlad/Level1Gujclass — Akshar Gujarati Learner, a React 19 + Vite PWA teaching
Gujarati consonants. 34 letters in src/curriculum.js, everything else in one src/App.jsx (3,022 lines,
53 useState, 14 useEffect). Live at level1gujclass.vercel.app. The real product doc is prd.md
(the README is still the Vite template).

## Hard constraints (do not violate in ANY PR)
- Offline-first PWA: after PR 1 there must be NO runtime dependency on fonts.googleapis.com or any
  third-party call. Self-host assets; precache via service worker.
- Waypoints are calibrated to the exact letterforms of Noto Sans Gujarati. Any font change must keep
  the guide glyph visually identical or re-verify waypoint alignment.
- Target audience refined to ages 6–8 (was 3–8): a 3–4yo can't read transliteration and a 7–8yo finds
  the current gate/rewards babyish. The parent gate generates (6–13)+(4–10), sums of 10–23, which a
  7–8yo solves in their head — the gate defeats itself at the top of its own range.
- WCAG 2.2 AA: 44px touch targets (min-h-[44px] is currently a DEAD class), no user-scalable=no
  (WCAG 1.4.4), contrast >= 4.5:1.
- Single source of truth for colors (see Theme section). Do not reintroduce parallel hex systems.

## Theme (fold into PR 2)
Three parallel color systems must collapse into one: (1) ~14 CSS custom props on :root, (2) ~150
unresolved Tailwind-style classes in JSX, (3) 16 hardcoded hexes in JSX. The palette itself is
coherent: ~84 tokens in 7 families — slate neutrals (240 uses), indigo primary (106), amber
points/rewards (59), emerald success (46), rose errors (40), purple (6, gradients), pink (2). Today
they only agree because --primary:#4f46e5 == indigo-600 by luck.
Fix: Tailwind v4 @theme with semantic tokens (--color-primary, --color-reward, --color-success,
--color-danger). CSS var and utility class become the same object; canvas code reads the same vars
via getComputedStyle; delete the dead :root block and the 16 hardcoded hexes in the same PR. Add an
oxlint rule banning raw hex in .jsx.

## The PR sequence (in order — a few unblock the others)

PR 1 — Font self-hosting + DPR canvas fix (DONE)
  - Self-host a Gujarati subset woff2 of Noto Sans Gujarati in /public; drop the @import on
    index.css line 1.
  - Add devicePixelRatio scaling to the tracing canvas (fixed 380x320 backing store stretched by
    CSS = blurry trace guide on every modern phone). Keep waypoint math correct at any DPR.

PR 2 — Tailwind v4 migration (DONE)
  - Add @tailwindcss/vite; strip the ~197 hand-rolled utilities from index.css; keep only :root
    tokens (replaced by @theme above), .font-gujarati, keyframes, safe-area rules.
  - ~150 of 307 utility classes have no CSS rule today (dead): min-h-[44px] (18 uses), hidden (6),
    max-w-md, most gap-*/space-y-*/leading-*, the lone sm: breakpoint. Expect real layout shifts as
    they suddenly resolve — that is the point; review on a device.
  - Include the Theme work above (semantic @theme tokens + no-raw-hex lint rule).

PR 3 — Accessibility corrections (DONE)
  - Drop maximum-scale=1.0, user-scalable=no from index.html (WCAG 1.4.4 failure).
  - Re-verify 44px targets now that min-h-[44px] actually resolves; fix any contrast that moved in
    PR 2. Small.

PR 4 — Storage layer (DONE)
  - One useLocalStorage hook replacing ~10 duplicated state+effect pairs in App.jsx; single guj:
    namespace; schema-version key with a migration path.

PR 5 — Normalize waypoint coordinates (DONE)
  - Convert curriculum.js from absolute px to a 0–100 path space; update the ~10 hardcoded
    380/320 sites; migrate any saved guj_custom_waypoints_* overrides; update the editor's JSON
    import/export format. Medium, touches the core.
  - Shipped: src/lib/waypoints.js owns the path space (0–100 on both axes, a percentage of the
    tracing box, hundredth resolution) and the logical canvas size it is multiplied by at draw
    time. Stored overrides in the old pixel range are detected by shape (a coordinate past 100
    in either axis) and converted on read; guj:version is now 2.

PR 6 — Extract the tracing engine + accuracy score (DONE)
  - Pull snapping, sequential validation, and completion scoring into a headless module with no
    React/DOM. Add Vitest — the first tests in the repo. Much easier after PR 5.
  - Add a real accuracy score (not just binary waypoint completion) — enables the below.
  - Shipped: src/lib/tracingEngine.js. createTracingSession(waypoints, opts) returns a session
    with startStroke / addPoint / endStroke / nextWaypoint / isComplete / getScore / getAccuracy /
    getMeanDeviation / getCompletedWaypoints / getStrokes / reset. Everything is in the 0-100 path
    space; radii are percent of the box WIDTH and the y axis is multiplied by opts.yScale (box
    height / width) before any distance, so a radius is a circle on screen and not an ellipse.
    App.jsx passes hitRadius = 28px-as-percent and yScale = 320/380, which is the tolerance the
    app has always had.
  - getAccuracy() is 100 * max(0, 1 - meanDeviation / accuracyTolerance), where meanDeviation is
    the mean distance from each drawn sample to the nearest segment of the waypoint polyline
    (split at moveTo, so the pen-lift gap is not traceable) and accuracyTolerance defaults to the
    hit radius. 100 = on the line. It is additive: getScore() still reports the same binary
    done/not-done, and completion is unchanged. Accuracy says how neatly, completion says how
    much — a single dot on the line scores 100, which is why both ship.
  - Not extracted: snapToCenterline. It snaps to the centre of mass of the rendered glyph by
    reading pixels out of an offscreen canvas, which is a DOM capability, not geometry, and it is
    the waypoint editor's tool, not the child's. The engine's snapRadius/onPath is the pure
    analogue — projection onto the ideal polyline.
  - PR 7 hook: the three-mode UI reads getAccuracy(); nothing renders it yet.

PR 7 — Split App.jsx (DONE)
  - TraceView, GameZone, StickerShop, ParentDashboard, WaypointEditor + a shared store. Pure
    refactor, zero behavior change; reviewable only because PRs 4–6 carved out the hard parts.
  - PR 7b (slot in here): parent dashboard gets its own adult register — same tokens, different
    geometry (wrapper class .surface-adult: tighter radii ~0.5rem vs 1.5rem, denser rows, no
    gradients/emoji, tabular numerals). Scope: ParentDashboard + WaypointEditor surfaces only.

PR 8 — PWA hardening (DONE)
  - Add runtimeCaching (precache self-hosted fonts + recorded audio once added), offline fallback
    page, update-available prompt (autoUpdate currently reloads mid-lesson under the child).
  - Generate real 192 and 512 icons (manifest entries both point at the same icon.png;
    purpose 'any maskable' on both is wrong).

PR 9 — CI + README (DONE)
  - GitHub Actions: oxlint + build + tests on PR, plus Lighthouse CI with a budget enforcing the
    sub-1s claim. Rewrite the README (still the Vite template) as part of this PR.
  - NOTE: the thread recommends shipping a minimal PR 0 (oxlint + build + smoke test) before the
    other work so later PRs are verifiable. Fold the lint/build/test harness into the earliest
    feasible PR and use it to verify each subsequent one.

PR 10 — Recorded audio (DONE)
  - gu-IN voices are missing on most devices, so the oscillator fallback is what kids actually
    hear. Ship 34 recorded letter clips (gu-IN), precached by the service worker, with the
    oscillator fallback retained.
  - Shipped: 75 clips in src/assets/audio (898 KB), one voice — gu-IN-DhwaniNeural via
    edge-tts. 34 letter_<id> (the bare syllable), 34 lesson_<id> ('<letter>. <word>.', the
    line TraceView reads on open) and 7 phrase_<key> (the fixed lines the games and the
    sandbox say). Letters and lesson lines at -10% rate; phrases at the default.
  - src/lib/audio.js gains a pure exported resolveClip(text) -> URL | null, mapping built at
    module load from an eager import.meta.glob of the folder plus curriculum.js, so no id is
    written twice. speak() plays the clip through one reused HTMLAudioElement (paused and
    rewound first, so a second tap replaces rather than layers) and otherwise runs the
    unchanged speechSynthesis path. Unmatched text, a missing file and a refused play() all
    end there: nothing can leave a letter silent. playSound (the oscillator SFX) is untouched.
  - mp3 is in the workbox globPatterns — the clips are hashed build output, so precache is
    correct and never stale. Precache is now 91 entries / 1.82 MB.
  - scripts/tts-generate.sh regenerates the set from scratch (own venv, edge-tts, ids read
    out of curriculum.js). The seven phrase strings live in both the script and PHRASE_CLIPS
    in audio.js: change a spoken line in a view and it must change in both, or that line
    quietly drops back to the synthesizer.

PR 11 — Parent gate (DONE)
  - Hash the PIN; remove the 1234 default in favor of forced first-run setup; remove the math
    challenge (sums of 10–23 are trivial for a 7–8yo); soften "security" language in prd.md to
    match reality (it's a speed bump).

PR 12 — Input validation (DONE)
  - Shipped: src/lib/validate.js is the one boundary — bounded numbers with a name (points 0-999999,
    brush width 1-64), the unlocked sticker list checked against the catalogue entry by entry, the
    4-digit passcode rule, a whole-number parse for the math gate, and the waypoint schema. Every
    correction is a console.warn; every refusal names the field, and for an array the entry index.
    readStored/useLocalStorage take a `validate` guard that runs on every value they return, not
    only a migrated v0 one, and the corrected value replaces the bad one on disk. The points and
    sticker setters validate too, so the boundary is not read-only.
  - The editor gained the missing direction: a paste box and Load JSON, applied whole or not at all,
    with the reason inline (role="alert") and the previous letter kept. A 0-380 block is converted
    and the notice says so. Loading is session-only; Save Waypoints still writes to the device.
  - ErrorBoundary (the one class in src/ — getDerivedStateFromError has no hook form) wraps each of
    the eight view branches in App.jsx separately, not the switch: "Something went wrong loading
    this screen" plus Try again, which remounts the subtree. The nav, the header and the other seven
    screens survive.
  - 41 tests across tests/validate.test.js, storeValidation.test.jsx, waypointJsonLoad.test.jsx and
    errorBoundary.test.jsx. prd.md gained 5.3 (failure containment) and 6.2 (the boundary table, the
    schema, and where "no silent data loss" is now true).
  - One judgement call worth knowing: a sticker id the catalogue does not have is dropped, because
    every view already rendered nothing for it while the dashboard counted it. The v0 migration
    fixture moved to real ids accordingly.

  - Schema-validate imported waypoint JSON; wrap the app in an error boundary. Today a malformed
    paste can leave a letter untraceable with no recovery path.
  - The waypoint schema, as of PR 5: an array of >= 2 objects, each { x, y, label } with an
    optional moveTo: true. x and y are finite numbers in 0..100 — the path space, NOT pixels —
    and PATH_MAX in src/lib/waypoints.js is the range to validate against, not a literal 100.
    label is the 1-based index as a string, in order. moveTo is absent or true, never on the
    first point. A coordinate past 100 is not out of range, it is the pre-v2 pixel format: route
    it through normalizeWaypoints (same as the storage read path) or reject the file outright.
    What it must not do is clamp — that imports a stale file as a letterform crushed against the
    right and bottom edges of the box, which is exactly the silent untraceable letter this PR is
    for.

PR 13+ — Phase 5 (blocked on PR 4 — do not start earlier)
  - Vowels curriculum; multi-child profiles.

## Learning-mode improvements (ages 6–8; weave into the PRs marked)
- Tracing modes (PR 6): numbered waypoints are training wheels that never come off — every trace is
  maximum assistance forever, so there's no visible improvement. Add three modes (e.g. guided /
  timed-challenge / free) with a real accuracy score to back the progression.
- Rework rewards from purchase to mastery (PR 4): stickers/milestones tied to accuracy and
  streaks, not raw points.
- Make progress legible (PR 7b dashboard): per-letter accuracy trend, not just completion count.
- Dial back baby cues (rounding toward PR 2/3): drop rounded-3xl excess and unicorn-tier copy;
  the 6–8 audience doesn't need it.

## Execution rules for the coding agent
- Work PR-by-PR in the listed order. One git branch + commit per PR (branch: pr/<n>-<slug>).
- After each PR: npm run build must pass; run lint + the test suite (from PR 9's harness, or
  PR 0-equivalent) if it exists.
- Never break the offline claim; never depend on Google Fonts or other third-party runtime calls.
- Keep changes reviewable: small commits, no drive-by refactors outside the PR's scope.
- prd.md is the spec — update it when a PR changes a stated requirement (gate, age range, PWA).
