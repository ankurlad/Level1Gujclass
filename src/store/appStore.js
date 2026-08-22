import { createContext, createElement, useContext, useEffect, useReducer, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { playSound as playSoundEffect } from '../lib/audio';
import { loadSavedCurriculum } from '../lib/curriculumStorage';
import { createPinRecord, takeLegacyPlaintextPin } from '../lib/parentPin';
import { themeColor } from '../lib/theme';
import { createTracingSession } from '../lib/tracingEngine';
import { CANVAS_H, CANVAS_W, canvasToPathXRaw } from '../lib/waypoints';

// The state the views share, in one place.
//
// PR 7 split a 3,614-line App.jsx into five views plus their chrome. Most of
// what App held was local to one section and moved with it; this module holds
// the remainder — everything two or more views read or write:
//
//   persisted   points, progress, stickers, brush, sound, editor mode, gate
//               type, parent passcode digest, unlock-all, install dismissal.
//               Each one still goes through useLocalStorage (PR 4), so the
//               `guj:` keys, their coercions and the v0 adoption path are
//               untouched — the store only changes who calls the hook.
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

// v0 read these two through `Number(...) || fallback` and the flags through
// `=== 'true'`. Both coercions have to survive the move, or a stray value left
// by an older build would land in state as a string.
const toNumber = (fallback) => (value) => Number(value) || fallback;
const toBoolean = (value) => value === true || value === 'true';

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
  tempPasscode: '',
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
      return { ...state, gateTarget: action.target, tempPasscode: '' };

    case 'gate/cancel':
      return { ...state, gateTarget: null };

    case 'gate/open':
      return { ...state, view: state.gateTarget, gateTarget: null };

    case 'gate/setTempPasscode':
      return { ...state, tempPasscode: action.tempPasscode };

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

  const [points, setPoints] = useLocalStorage('points', 0, toNumber(0));
  const [progressLog, setProgressLog] = useLocalStorage('progress', () => ({
    tracedCount: 0,
    quizScore: 0,
    completedLessons: []
  }));
  const [unlockedStickers, setUnlockedStickers] = useLocalStorage('stickers', () => []);

  const [brushColor, setBrushColor] = useLocalStorage(
    'brush_color',
    () => themeColor('--color-primary')
  );
  const [brushWidth, setBrushWidth] = useLocalStorage('brush_width', 16, toNumber(16));
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

  const value = {
    // Session state
    ...session,
    currentLesson,
    dispatch,

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
