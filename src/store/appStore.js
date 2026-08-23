import { createContext, createElement, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { childScopedKey, useLocalStorage } from '../hooks/useLocalStorage';
import { playSound as playSoundEffect } from '../lib/audio';
import {
  ACTIVE_CHILD_KEY,
  CHILDREN_KEY,
  FIRST_CHILD_ID,
  addChildTo,
  ensureChildProfiles,
  resetChildKeys
} from '../lib/childProfiles';
import { loadSavedCurriculum } from '../lib/curriculumStorage';
import { createPinRecord, takeLegacyPlaintextPin } from '../lib/parentPin';
import { themeColor } from '../lib/theme';
import { createTracingSession } from '../lib/tracingEngine';
import { sanitizeChildren, sanitizeStickerIds, toBrushWidth, toPoints } from '../lib/validate';
import { CANVAS_H, CANVAS_W, canvasToPathXRaw } from '../lib/waypoints';

// The state the views share, in one place.
//
// PR 7 split a 3,614-line App.jsx into five views plus their chrome. Most of
// what App held was local to one section and moved with it; this module holds
// the remainder — everything two or more views read or write:
//
//   persisted   points, progress, stickers, brush, sound, editor mode, gate
//               type, parent passcode digest, unlock-all, install dismissal,
//               and the child profile list. Each one still goes through
//               useLocalStorage (PR 4), so the `guj:` keys, their coercions and
//               the v0 adoption path are untouched — the store only changes who
//               calls the hook.
//               Three of them are per child (PR 13b): points, progress and
//               stickers read `guj:child:<id>:*`, where the id comes from
//               `guj:active_child`. The key is what changes when a child
//               switches, so there is no second copy of a ledger to keep in
//               step; everything else on the list is device-wide, and
//               src/lib/childProfiles.js says why for each one.
//   session     the view on screen, the lesson being traced, the curriculum
//               with its saved waypoint overrides, the parent gate, and the
//               worksheet selection. A reducer, because these are the ones a
//               single interaction changes in pairs (the gate opens a view and
//               closes itself; a worksheet button sets the mode, the letter and
//               where Back goes).
//   engine      the PR 6 tracing session for the current letter, as a ref.
//
// It is deliberately one context and not memoized: before the split every one
// of these lived in App and every change re-rendered the whole tree, so a
// single provider whose value changes with it reproduces exactly that.

// How the child's tracing is judged. The engine works in the 0-100 path space
// and measures in percent of the box width, so the two numbers the app has
// always used in pixels are converted once, here.
//
// hitRadius: the 28px circle checkWaypoint used to test in logical pixels.
// yScale:    the box is 380x320, so path units are not square. Scaling y by
//            the aspect ratio keeps the radius a circle on screen; without it
//            it would be an ellipse, and the same 28px would be accepted
//            sideways but refused going up.
const TRACE_HIT_RADIUS_PX = 28;
const TRACE_SESSION_OPTS = {
  hitRadius: canvasToPathXRaw(TRACE_HIT_RADIUS_PX),
  yScale: CANVAS_H / CANVAS_W
};
const NO_WAYPOINTS = [];

// v0 read the flags through `=== 'true'`; that coercion has to survive the
// move, or a stray value left by an older build would land in state as a
// string. The two numbers used to be read the same way, through
// `Number(...) || fallback` — they now go through the bounded validators in
// src/lib/validate.js instead, which do the same coercion and additionally
// refuse a value outside the range the app can render.
const toBoolean = (value) => value === true || value === 'true';

// A child who has traced nothing. One factory, because the dashboard's reset
// has to produce exactly what a new profile starts with.
const emptyProgress = () => ({
  tracedCount: 0,
  quizScore: 0,
  completedLessons: []
});

// The views GameZone answers for: its menu plus one per game. The nav bar
// highlights Games for all five, which is the list it already carried.
export const GAME_VIEWS = ['games', 'match', 'quiz', 'phonics_game', 'memory_match'];

const initialSession = () => ({
  view: 'home', // home | map | learn | games | match | quiz | phonics_game | memory_match | sandbox | stickers | dashboard | worksheets
  currentLessonIndex: 0,
  // Custom Session Curriculum with overrides loaded
  sessionCurriculum: loadSavedCurriculum(),
  // A render mirror of the tracing session's completed waypoints; the session
  // itself (the ref below) stays the source of truth.
  completedWaypoints: [],
  // The view the parent gate is currently guarding, or null when it is closed.
  // There is no "unlocked for the session" flag: the gate has always
  // re-challenged on every entry and this PR does not change that.
  gateTarget: null,
  worksheetMode: 'single', // 'single' | 'grid' | 'match'
  selectedWorksheetLetter: 'ka',
  worksheetGroup: 'all',
  worksheetFromView: 'dashboard'
});

function reducer(state, action) {
  switch (action.type) {
    case 'view/set':
      return { ...state, view: action.view };

    case 'lesson/select':
      return { ...state, currentLessonIndex: action.index };

    case 'curriculum/set':
      return { ...state, sessionCurriculum: action.curriculum };

    case 'curriculum/setLessonWaypoints': {
      const sessionCurriculum = [...state.sessionCurriculum];
      sessionCurriculum[action.index] = {
        ...sessionCurriculum[action.index],
        waypoints: action.waypoints
      };
      return { ...state, sessionCurriculum };
    }

    case 'trace/setCompletedWaypoints':
      return { ...state, completedWaypoints: action.completedWaypoints };

    case 'gate/request':
      return { ...state, gateTarget: action.target };

    case 'gate/cancel':
      return { ...state, gateTarget: null };

    case 'gate/open':
      return { ...state, view: state.gateTarget, gateTarget: null };

    case 'worksheets/open':
      return {
        ...state,
        view: 'worksheets',
        worksheetFromView: action.from,
        worksheetMode: action.mode ?? state.worksheetMode,
        selectedWorksheetLetter: action.letter ?? state.selectedWorksheetLetter
      };

    case 'worksheets/setMode':
      return { ...state, worksheetMode: action.worksheetMode };

    case 'worksheets/setGroup':
      return { ...state, worksheetGroup: action.worksheetGroup };

    case 'worksheets/setLetter':
      return { ...state, selectedWorksheetLetter: action.selectedWorksheetLetter };

    default:
      return state;
  }
}

const AppStoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const [session, dispatch] = useReducer(reducer, undefined, initialSession);

  // Who is playing, resolved before anything below reads a value that belongs
  // to them. The initialiser runs once and is idempotent, which is what makes it
  // safe under StrictMode's double invoke: it creates the implicit first child
  // and adopts a pre-13b store on the first boot and does nothing on every one
  // after. See src/lib/childProfiles.js.
  const [bootstrap] = useState(ensureChildProfiles);

  // `childProfiles`, not `children` — that name is already this component's
  // React prop, and shadowing it would put the profile list where the app's
  // whole tree belongs.
  const [childProfiles, setChildProfiles] = useLocalStorage(
    CHILDREN_KEY,
    bootstrap.children,
    undefined,
    sanitizeChildren
  );
  const [activeChildId, setActiveChildId] = useLocalStorage(ACTIVE_CHILD_KEY, bootstrap.activeChildId);

  // The two keys can disagree — a hand-edited `guj:active_child`, or a profile
  // the validator dropped — so the list is what decides. Falling back to the
  // first child keeps the scoped reads below pointing at a profile that exists
  // rather than at `child:undefined:points`.
  const activeChild = childProfiles.find((child) => child.id === activeChildId) ?? childProfiles[0];
  const scopedChildId = activeChild?.id ?? FIRST_CHILD_ID;
  const scoped = (key) => childScopedKey(scopedChildId, key);

  // The two validated reads. The fourth argument is the PR 12 guard: it runs on
  // whatever comes back off disk, so `guj:child:c1:points` holding 1e8 and
  // `guj:child:c1:stickers` holding one junk entry are corrected at the boundary
  // instead of reaching a view that renders a six-digit badge or counts three
  // stickers and draws two.
  //
  // These three are the per-child keys. The key itself changes when the active
  // child changes, and useLocalStorage re-reads for the new key in the same
  // render — nothing here has to clear or reload anything by hand.
  const [points, setStoredPoints] = useLocalStorage(scoped('points'), 0, undefined, toPoints);
  const [progressLog, setProgressLog] = useLocalStorage(scoped('progress'), emptyProgress);
  const [unlockedStickers, setStoredStickers] = useLocalStorage(
    scoped('stickers'),
    () => [],
    undefined,
    sanitizeStickerIds
  );

  // Both setters validate too, so the boundary is not only the read: every
  // award, purchase and reset lands in state through the same rule that let the
  // value in, and the ledger cannot walk past its cap at +10 a letter.
  const setPoints = (next) =>
    setStoredPoints((prev) => toPoints(typeof next === 'function' ? next(prev) : next));
  const setUnlockedStickers = (next) =>
    setStoredStickers((prev) => sanitizeStickerIds(typeof next === 'function' ? next(prev) : next));

  const [brushColor, setBrushColor] = useLocalStorage(
    'brush_color',
    () => themeColor('--color-primary')
  );
  const [brushWidth, setBrushWidth] = useLocalStorage('brush_width', 16, undefined, toBrushWidth);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('sound_enabled', true, toBoolean);

  const [editorMode, setEditorMode] = useLocalStorage('editor_mode', false, toBoolean);
  const [installDismissed, setInstallDismissed] = useLocalStorage('install_dismissed', false, toBoolean);

  // Parent Gate & Security Configurations
  const [gateType, setGateType] = useLocalStorage('gate_type', 'math'); // math | pin
  // The salted digest of the passcode, or null when no passcode has been set.
  // There is deliberately no default: a PIN every install shares is not a gate,
  // so the first parent to reach the PIN prompt chooses one.
  const [parentPinRecord, setParentPinRecord] = useLocalStorage('parent_pin_hash', null);

  // Parent Lock Progression Toggle (Idea 2)
  const [parentUnlockAll, setParentUnlockAll] = useLocalStorage('parent_unlock_all', false, toBoolean);

  // The tracing engine session for the letter on screen. A ref, not state:
  // during a drag the pointer handlers touch it dozens of times between
  // renders, and each one has to see what the last one wrote. completedWaypoints
  // above is now only a render mirror of it — the session is the source of
  // truth for what has been hit.
  const traceSessionRef = useRef(null);
  const traceWaypointsRef = useRef(null);

  const currentLesson = session.sessionCurriculum[session.currentLessonIndex];

  // v0 kept the passcode in cleartext. Evict it on the first render after the
  // update — takeLegacyPlaintextPin deletes it synchronously, so the plaintext
  // is gone from storage before the digest that replaces it exists.
  useEffect(() => {
    const plaintext = takeLegacyPlaintextPin();
    if (plaintext === null) return;

    let cancelled = false;
    createPinRecord(plaintext)
      .then((record) => { if (!cancelled) setParentPinRecord(record); })
      .catch((e) => {
        // The PIN is unrecoverable at this point, which is the right trade: the
        // parent re-sets it at the next prompt, and no cleartext survives.
        console.error('Could not hash the stored parent passcode', e);
      });
    return () => { cancelled = true; };
  }, [setParentPinRecord]);

  // The live session, rebuilt whenever the letter's waypoints change identity —
  // which the editor does on every drag, and switching letters does once.
  const getTraceSession = () => {
    // NO_WAYPOINTS, not a fresh [], so a letter without waypoints keeps one
    // session instead of building a new one on every pointer sample.
    const waypoints = currentLesson?.waypoints || NO_WAYPOINTS;
    if (!traceSessionRef.current || traceWaypointsRef.current !== waypoints) {
      traceWaypointsRef.current = waypoints;
      traceSessionRef.current = createTracingSession(waypoints, TRACE_SESSION_OPTS);
    }
    return traceSessionRef.current;
  };

  // playSound kept its one-argument signature: the setting it consults is in
  // this store, so the store is what binds it.
  const playSound = (type) => playSoundEffect(type, soundEnabled);

  // The one action every view takes, bound so navigation reads the same as it
  // did when App owned the view state. Everything else goes through dispatch.
  const setView = (nextView) => dispatch({ type: 'view/set', view: nextView });

  // Handing the tablet to the other child.
  //
  // It changes one key. Everything scoped follows from that, because the scoped
  // keys are derived from it — there is no second copy of a child's points to
  // keep in step. It goes home because the screen belongs to whoever was just
  // on it: a letter half traced, or a sticker shop showing a balance that is
  // about to change.
  //
  // What it does not do is touch the gate. gateTarget is session state and is
  // not cleared or set here, parent_pin_hash and gate_type are device keys and
  // are not in CHILD_SCOPED_KEYS, and the gate has never had an "unlocked for
  // this session" flag — it re-challenges on every entry. Switching child is
  // therefore not a way into the parents' room.
  const switchChild = (childId) => {
    if (childId === activeChildId) return;
    if (!childProfiles.some((child) => child.id === childId)) return;
    setActiveChildId(childId);
    setView('home');
  };

  // Returns the same {ok, message} shape the name rules produce, so the popover
  // can say why a name was refused instead of silently doing nothing.
  const addChild = (name) => {
    const result = addChildTo(childProfiles, name);
    if (!result.ok) return result;
    setChildProfiles(result.children);
    setActiveChildId(result.child.id);
    setView('home');
    return result;
  };

  // Wipes one child's keys, and only theirs. For the child currently on screen
  // the live state has to come back to the same defaults the cleared keys would
  // read as — the write effect then re-materialises them.
  const resetChild = (childId) => {
    resetChildKeys(childId);
    if (childId !== scopedChildId) return;
    setStoredPoints(0);
    setStoredStickers([]);
    setProgressLog(emptyProgress());
  };

  const value = {
    // Session state
    ...session,
    currentLesson,
    dispatch,

    // Child profiles: the list is device-wide, the values above are the active
    // one's. activeChildId is the id the scoped keys actually use, which is the
    // one a caller wants — see the fallback above.
    childProfiles, activeChild, activeChildId: scopedChildId,
    switchChild, addChild, resetChild,

    // Persisted state
    points, setPoints,
    progressLog, setProgressLog,
    unlockedStickers, setUnlockedStickers,
    brushColor, setBrushColor,
    brushWidth, setBrushWidth,
    soundEnabled, setSoundEnabled,
    editorMode, setEditorMode,
    installDismissed, setInstallDismissed,
    gateType, setGateType,
    parentPinRecord, setParentPinRecord,
    parentUnlockAll, setParentUnlockAll,

    // Tracing engine
    traceSessionRef,
    getTraceSession,

    // Bound helpers
    setView,
    playSound
  };

  return createElement(AppStoreContext.Provider, { value }, children);
}

export function useAppStore() {
  const store = useContext(AppStoreContext);
  if (store === null) {
    throw new Error('useAppStore must be used inside <AppStoreProvider>');
  }
  return store;
}
