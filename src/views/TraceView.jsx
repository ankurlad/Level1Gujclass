import { useEffect, useRef, useState } from 'react';
import { Printer, RotateCcw, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWaypointEditor } from '../hooks/useWaypointEditor';
import { speak } from '../lib/audio';
import { canvasRefCoords, setupCanvasScaling } from '../lib/canvas';
import { BRUSH_TOKENS, themeColor } from '../lib/theme';
import { ensureGujaratiFont } from '../lib/ensureGujaratiFont';
import {
  CANVAS_H,
  CANVAS_W,
  canvasToPathXRaw,
  canvasToPathYRaw,
  pathToCanvasX,
  pathToCanvasY
} from '../lib/waypoints';
import { useAppStore } from '../store/appStore';
import WaypointEditor from './WaypointEditor';

// The tracing screen — the one the whole app is built around.
//
// It owns the canvas: the guide letter and dashed path, the ink under the
// finger, the DPR/resize repaint, and the handoff of every pointer sample to
// the PR 6 tracing engine (which lives in the store, so the session survives a
// trip to the map and back). What it does with the engine's verdict — the
// chime, the buzz, the dots, the confetti, the points, the next letter — is
// here too, because that is the part that is this screen and not the engine.
//
// The waypoint builder is a guest: useWaypointEditor holds its state and its
// operations, this component hands it the pointer events the canvas receives
// and renders its panel underneath.

// A waypoint with moveTo:true starts a new stroke. Colors are the one shared
// language between the canvas dashed guide, the DOM dots, and the legend:
// each stroke owns a hue, so where two strokes cross (a knot/overlap) the
// child sees two different-colored dot clusters in the same place — "two
// strokes live here, drawn at different times." Order is the drawing order:
// blue first, red second, green third, amber fourth (4 is the practical
// max for the 42-letter set).
const STROKE_PALETTE_TOKENS = [
  { token: '--color-primary', border: '--color-primary-shade' }, // blue
  { token: '--color-danger', border: '--color-danger-shade' }, // red
  { token: '--color-success', border: '--color-success-shade' }, // green
  { token: '--color-reward', border: '--color-reward-shade' }, // amber
];

// Assign each waypoint index to its stroke (0-based). A moveTo waypoint is
// the FIRST dot of a new stroke; indices before it belong to the previous
// one. Single-stroke letters all land on 0.
const strokeIndexOf = (waypoints, idx) => {
  let s = 0;
  for (let i = 0; i < idx; i++) if (waypoints[i] && waypoints[i].moveTo) s++;
  return Math.min(s, STROKE_PALETTE_TOKENS.length - 1);
};

const PHONICS_GUIDE = {
  ka: { phonic: "ka", pron: "k as in cup" },
  kha: { phonic: "kha", pron: "kh as in Khan (aspirated)" },
  ga: { phonic: "ga", pron: "g as in go" },
  gha: { phonic: "gha", pron: "gh as in ghost (aspirated)" },
  cha: { phonic: "cha", pron: "ch as in chin" },
  chha: { phonic: "chha", pron: "chh as in match-head (aspirated)" },
  ja: { phonic: "ja", pron: "j as in joy" },
  jha: { phonic: "jha", pron: "jh as in hedgehog (aspirated)" },
  ta: { phonic: "ta", pron: "t as in toy (hard retroflex t)" },
  tha: { phonic: "tha", pron: "th as in lighthouse (aspirated hard t)" },
  da: { phonic: "da", pron: "d as in dog (hard retroflex d)" },
  dha: { phonic: "dha", pron: "dh as in mud-hut (aspirated hard d)" },
  ana: { phonic: "na", pron: "n as in under (retroflex n)" },
  ta2: { phonic: "ta", pron: "t as in pasta (soft dental t)" },
  tha2: { phonic: "tha", pron: "th as in think (soft dental th)" },
  da2: { phonic: "da", pron: "th as in mother (soft dental d)" },
  dha2: { phonic: "dha", pron: "dh as in breathe (aspirated soft d)" },
  na: { phonic: "na", pron: "n as in net" },
  pa: { phonic: "pa", pron: "p as in pen" },
  pha: { phonic: "pha", pron: "ph as in phone / puff" },
  ba: { phonic: "ba", pron: "b as in boy" },
  bha: { phonic: "bha", pron: "bh as in abhor (aspirated b)" },
  ma: { phonic: "ma", pron: "m as in map" },
  ya: { phonic: "ya", pron: "y as in yes" },
  ra: { phonic: "ra", pron: "r as in run" },
  la: { phonic: "la", pron: "l as in lion" },
  va: { phonic: "va", pron: "v as in van / water" },
  sha: { phonic: "sha", pron: "sh as in show" },
  ssa: { phonic: "sha", pron: "sh as in sugar (retroflex sh)" },
  sa: { phonic: "sa", pron: "s as in sun" },
  ha: { phonic: "ha", pron: "h as in home" },
  la2: { phonic: "la", pron: "l as in pearl (retroflex l)" },
  ksha: { phonic: "ksha", pron: "ksh as in action" },
  gna: { phonic: "gna", pron: "gya as in gyan (nasalized)" },
  // The vowels. Each pair is one sound held short or long, so the two entries
  // are deliberately the same mouth shape with a different length written out —
  // that contrast is the whole lesson.
  a: { phonic: "a", pron: "a as in about (short)" },
  aa: { phonic: "aa", pron: "aa as in father (long)" },
  i: { phonic: "i", pron: "i as in sit (short)" },
  ii: { phonic: "ee", pron: "ee as in feet (long)" },
  u: { phonic: "u", pron: "u as in put (short)" },
  uu: { phonic: "oo", pron: "oo as in food (long)" },
  r: { phonic: "ru", pron: "ri as in rich (vocalic r)" },
  l: { phonic: "lu", pron: "lri — a Sanskrit sound, rare in Gujarati" }
};

export default function TraceView() {
  const {
    view,
    currentLesson,
    currentLessonIndex,
    sessionCurriculum,
    completedWaypoints,
    progressLog,
    setProgressLog,
    setPoints,
    parentUnlockAll,
    brushColor, setBrushColor,
    brushWidth, setBrushWidth,
    editorMode,
    dispatch,
    setView,
    playSound,
    traceSessionRef,
    getTraceSession
  } = useAppStore();

  // Canvas Drawing & Styling Customizations
  const canvasRef = useRef(null);
  const lastPointRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [traceStartTime, setTraceStartTime] = useState(null);

  // The waypoint builder: its state, its canvas operations and its exports.
  const editor = useWaypointEditor({ canvasRef });
  const {
    editorActive,
    editorWaypoints,
    editorRecordMode,
    handleWaypointMouseDown,
    handleWaypointTouchStart,
    handleCanvasClick,
    startRecordedStroke,
    recordWaypoint
  } = editor;

  const handleLessonSpeech = () => {
    speak(`${currentLesson.letter}. ${currentLesson.word}.`);
  };

  // Canvas Tracing Draw setup
  //
  // FONT GATE — the cross-device fix. Every draw path in this component
  // renders the guide glyph in "Noto Sans Gujarati"; on a device whose
  // browser has not yet attached that font (iPhone, iPad, Kindle Fire,
  // Android phone or tablet) the browser silently falls back to a system
  // Gujarati font and the glyph lands WIDER and differently shaped — every
  // committed dot then sits "off the centerline", exactly the phone defect
  // we are chasing. index.html preloads the woff2 and index.css declares
  // @font-face, so on a healthy device the gate resolves in well under a
  // second. On a slow or broken one it waits the hard timeout before giving
  // up — better to draw late with the right font than instantly with the
  // wrong one, and on a truly dead font we still end up drawing (the app
  // must never hang a classroom).
  //
  // The cancelled-flag + guards make the late repaint idempotent and safe.
  // The gate is cached module-wide, so it resolves in ~0 ms on every call
  // after the first — the late repaint only matters once, on the very first
  // load of the app, when the font is still downloading.
  const paintGuideRef = useRef(() => {});
  useEffect(() => { paintGuideRef.current = () => drawTraceGuide(canvasRef.current); });
  useEffect(() => {
    if (view !== 'learn') return;
    const started = () => {
      const s = getTraceSession();
      return !!(s && s.points && s.points.length) ||
        !!(completedWaypoints && completedWaypoints.length);
    };
    let cancelled = false;
    ensureGujaratiFont().then(() => {
      if (cancelled) return;
      if (view !== 'learn') return;
      if (!canvasRef.current) return;
      if (started()) return;
      // Late repaint: the font finally attached between the first paint and
      // now. Redraw the guide on the right font — but NEVER over the ink of
      // a child who started tracing in the meantime (clearing the canvas is
      // not a trade we take against a few seconds of their stroke).
      paintGuideRef.current();
    });
    initCanvas();
    return () => { cancelled = true; };
  }, [view, currentLessonIndex, editorWaypoints]);

  // Repaint the background, guide letter and dashed waypoint path. Kept apart
  // from initCanvas so a resize can restore the guide without also resetting
  // the child's waypoint progress.
  const drawTraceGuide = (canvas) => {
    const ctx = setupCanvasScaling(canvas);

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background Grid paper style. Calibration constants — see snapToCenterline.
    // oxlint-disable-next-line theme/no-raw-hex
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Guide letter in slate-600 at 60% — strong enough to read clearly on a
    // phone behind the small numbered dots (kid must see the letterform to
    // judge where each stroke starts), light enough that the child's colored
    // ink and the dots stay the focus. History: 226,232,240 was white-on-white
    // (invisible); 148,163,184@0.75 read as a faint ghost and the dots
    // dominated the letter — raised to a clearly visible gray.
    ctx.font = '220px "Noto Sans Gujarati", "Baloo Bhai 2", sans-serif';
    ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentLesson.letter, CANVAS_W / 2, CANVAS_H / 2 + 10);

    // Draw dashed guide paths, one per stroke.
    //
    // Colors live on the DOTS, not the guide: the guide here is neutral
    // slate so the child's brush ink (any of the 5 palette colors, several
    // of which sit in the same hue family as the stroke dots) always reads
    // as "what I drew" against "what to draw." Stroke identity + order is
    // carried by the dot hue (blue → red → green → amber) and the numbers.
    if (currentLesson.waypoints && currentLesson.waypoints.length > 1) {
      const wps = currentLesson.waypoints;
      const strokes = [];
      let cur = [wps[0]];
      for (let i = 1; i < wps.length; i++) {
        if (wps[i].moveTo) {
          strokes.push(cur);
          cur = [wps[i]];
        } else {
          cur.push(wps[i]);
        }
      }
      strokes.push(cur);

      // Neutral guide ink — deliberately NOT one of the brush colors and
      // NOT a stroke-dot hue, so traced ink always stands out.
      // oxlint-disable-next-line theme/no-raw-hex
      const guideCol = editorMode && editorActive
        ? themeColor('--color-trace-path-editor')
        : 'rgba(100, 116, 139, 0.75)'; // slate-500 at 75%

      strokes.forEach((seg) => {
        // Draw the dashed path as a Catmull-Rom curve (converted to cubic
        // Béziers) through every waypoint.
        //
        // Why: the old code drew straight "chords" between adjacent dots with
        // lineTo. A chord cuts inside every curve in the stroke, so the guide
        // visibly drifted off the band's center at each bend (a child who
        // followed it traced off-center). The uniform Catmull-Rom spline
        // passes through every waypoint and follows the local tangent, so
        // the dashed line hugs the stroke's center between the dots.
        //
        // For the segment a→b with neighbors p0 and c:
        //   c1 = a + (b − p0) / 6
        //   c2 = b − (c − a) / 6
        //   ctx.bezierCurveTo(c1, c2, b)
        const pts = seg.map((wp) => [pathToCanvasX(wp.x), pathToCanvasY(wp.y)]);
        if (pts.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = guideCol;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([6, 6]);
        ctx.moveTo(pts[0][0], pts[0][1]);
        if (pts.length === 2) {
          ctx.lineTo(pts[1][0], pts[1][1]);
        } else {
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i === 0 ? pts[0] : pts[i - 1];
            const a = pts[i];
            const b = pts[i + 1];
            const c = i + 2 < pts.length ? pts[i + 2] : pts[pts.length - 1];
            ctx.bezierCurveTo(
              a[0] + (b[0] - p0[0]) / 6,
              a[1] + (b[1] - p0[1]) / 6,
              b[0] - (c[0] - a[0]) / 6,
              b[1] - (c[1] - a[1]) / 6,
              b[0],
              b[1]
            );
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Direction arrow between the stroke's first two dots — the
        // "entice" cue for kids who don't read numbers: it sits in the
        // clear band between them and points the way the pen travels.
        // Placed at 52% of the first segment so it never lands inside a
        // dot's ring.
        const [sx, sy] = pts[0];
        const [nx, ny] = pts[1];
        const ang = Math.atan2(ny - sy, nx - sx);
        const t = 0.52;
        const baseX = sx + (nx - sx) * t;
        const baseY = sy + (ny - sy) * t;
        const barb = 10;
        // Arrowhead: tip + two barbs, all pointing along the travel.
        const tipX = baseX + Math.cos(ang) * barb * 0.5;
        const tipY = baseY + Math.sin(ang) * barb * 0.5;
        ctx.beginPath();
        ctx.strokeStyle = guideCol;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.moveTo(tipX + Math.cos(ang + 2.7) * barb, tipY + Math.sin(ang + 2.7) * barb);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX + Math.cos(ang - 2.7) * barb, tipY + Math.sin(ang - 2.7) * barb);
        ctx.stroke();
      });
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawTraceGuide(canvas);
    getTraceSession().reset();
    dispatch({ type: 'trace/setCompletedWaypoints', completedWaypoints: [] });
    setTraceStartTime(performance.now());
  };

  // Rotating the device or zooming changes the backing store resolution, which
  // blanks the canvas. Re-scale and repaint the guide, but keep the waypoints
  // the child has already hit.
  useEffect(() => {
    if (view !== 'learn') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastW = canvas.width;
    let lastH = canvas.height;

    const handleResize = () => {
      const target = canvasRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round((rect.width || CANVAS_W) * dpr));
      const h = Math.max(1, Math.round((rect.height || CANVAS_H) * dpr));
      // Layout can settle without the resolution moving; leave the ink alone.
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      drawTraceGuide(target);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [view, currentLessonIndex, editorWaypoints, editorMode, editorActive]);

  const getCoords = (e) => canvasRefCoords(canvasRef, e);

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoords(e);

    if (editorMode && editorActive) {
      if (editorRecordMode) {
        // Record path drawing mode
        startRecordedStroke(x, y);

        // Save the unsnapped coordinates for relative distance checks!
        lastPointRef.current = { x, y };
        setIsDrawing(true);
        playSound('waypoint');

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = brushWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = themeColor('--color-reward'); // Amber trail while recording
      } else {
        handleCanvasClick(e);
      }
      return;
    }

    // Normal kids tracing mode
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    setIsDrawing(true);
    getTraceSession().startStroke();
    checkWaypoint(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoords(e);

    if (editorMode && editorActive && editorRecordMode) {
      const lastPoint = lastPointRef.current;
      if (lastPoint) {
        const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
        // Spacing downsampling threshold (35px) between unsnapped points
        if (dist >= 35) {
          recordWaypoint(x, y);

          // Save the unsnapped coordinates for relative distance checks!
          lastPointRef.current = { x, y };
          playSound('waypoint');
        }
      }

      const ctx = canvasRef.current.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
      return;
    }

    // Normal kids tracing mode
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    checkWaypoint(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Closes the stroke in the engine so the next pen-down starts a new one.
    // The editor's record mode never opened one, hence the optional call.
    traceSessionRef.current?.endStroke();
  };

  // Hands one pointer sample to the engine and turns its verdict into the
  // things only App can do: the chime, the buzz, the dots, the confetti.
  //
  // The sample arrives in logical pixels and the engine speaks the 0-100 path
  // space, so it converts here — exactly, without the clamp and rounding the
  // editor's write path applies. Everything after that (which waypoint is
  // next, the radius, the ordering rule, whether the letter is finished) is
  // the engine's; this function no longer knows what 28px means.
  const checkWaypoint = (x, y) => {
    const session = getTraceSession();
    const result = session.addPoint(canvasToPathXRaw(x), canvasToPathYRaw(y));
    if (!result.hit) return;

    dispatch({ type: 'trace/setCompletedWaypoints', completedWaypoints: session.getCompletedWaypoints() });

    playSound('waypoint');
    if (navigator.vibrate) navigator.vibrate(40);

    if (result.complete) {
      handleSuccess();
    }
  };

  const handleSuccess = () => {
    const timeTaken = ((performance.now() - traceStartTime) / 1000).toFixed(1);
    const speedBonus = Number(timeTaken) < 7 ? 15 : 5;
    const basePoints = 25;
    const totalGained = basePoints + speedBonus;
    
    setPoints(p => p + totalGained);
    
    setProgressLog(prev => {
      const isAlreadyCompleted = prev.completedLessons.includes(currentLesson.id);
      const completed = isAlreadyCompleted ? prev.completedLessons : [...prev.completedLessons, currentLesson.id];
      return {
        tracedCount: prev.tracedCount + 1,
        quizScore: prev.quizScore,
        completedLessons: completed
      };
    });

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });

    playSound('success');
    speak(`અદ્ભુત! સાચું છે!`);

    setTimeout(() => {
      const nextIndex = (currentLessonIndex + 1) % sessionCurriculum.length;
      dispatch({ type: 'lesson/select', index: nextIndex });
      initCanvas();
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Navigation Selector */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => setView('map')}
          className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
        >
          🗺️ Map
        </button>
        
        <div className="flex gap-1.5 overflow-x-auto max-w-[280px] no-scrollbar pb-1">
          {sessionCurriculum.map((item, idx) => {
            const isLocked = idx > 0 && 
                             !progressLog.completedLessons.includes(sessionCurriculum[idx - 1].id) && 
                             parentUnlockAll !== true;
            return (
              <button
                key={item.id}
                disabled={isLocked}
                onClick={() => dispatch({ type: 'lesson/select', index: idx })}
                aria-label={`Lesson ${item.english}`}
                className={`min-w-[44px] min-h-[44px] rounded-xl font-bold flex justify-center items-center border transition-all flex-shrink-0 text-sm ${currentLessonIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105' : isLocked ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                <span className="font-gujarati">{item.letter}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tracing Content Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-3">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-gujarati text-indigo-600">{currentLesson.letter}</span>
            <span className="text-slate-500 font-bold text-lg">({currentLesson.english})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => dispatch({
                type: 'worksheets/open',
                from: 'learn',
                mode: 'single',
                letter: currentLesson.id
              })}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl transition shadow-sm flex items-center gap-1.5 font-bold text-xs"
              title="Print Practice Worksheet"
              aria-label="Print Practice Worksheet"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Sheet</span>
            </button>

            <button 
              onClick={handleLessonSpeech}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2.5 rounded-2xl transition shadow-sm flex items-center justify-center min-w-[44px] min-h-[44px]"
              title="Listen Pronunciation"
              aria-label="Listen Pronunciation"
            >
              <Volume2 size={20} className="fill-indigo-100" />
            </button>
          </div>
        </div>

        {/* Word association card */}
        <div className="flex items-center gap-3 bg-indigo-50/50 w-full p-3 rounded-2xl border border-indigo-50 mb-3">
          <span className="text-4xl">{currentLesson.emoji}</span>
          <div>
            <h4 className="font-extrabold text-slate-800 text-base">{currentLesson.word}</h4>
            <p className="text-indigo-600/80 font-bold text-sm">{currentLesson.wordEnglish}</p>
          </div>
        </div>

        {/* Phonics Helper Card */}
        <div className="flex items-center justify-between w-full p-3 mb-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
          <div className="flex flex-col text-left font-sans">
            <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wide">Pronunciation Helper</span>
            <span className="text-xs font-bold text-slate-700 mt-0.5">
              <strong>"{PHONICS_GUIDE[currentLesson.id]?.phonic || currentLesson.english}"</strong> — {PHONICS_GUIDE[currentLesson.id]?.pron || ''}
            </span>
          </div>
          <button
            onClick={() => speak(currentLesson.letter)}
            className="bg-amber-500 hover:bg-amber-600 text-ink p-2.5 rounded-xl shadow-sm transition flex-shrink-0"
            title="Listen Pronunciation"
          >
            <Volume2 size={16} className="fill-ink" />
          </button>
        </div>

        {/* Canvas draw field */}
        <div 
          style={{ position: 'relative', aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
          className="trace-surface border-4 border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-slate-100 w-full max-w-[380px] flex-1 flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-pointer touch-none"
          />

          {/* Guidance Waypoints — color-coded per stroke: blue = stroke 1,
              red = stroke 2, green = stroke 3, amber = stroke 4. The
              colored cluster itself is the "you're here in this stroke"
              signal for kids who don't read numbers; the number is still
              on the dot for parents and kids who do. */}
          {currentLesson.waypoints.map((wp, idx) => {
            const isCompleted = completedWaypoints.includes(idx);
            const isNext = completedWaypoints.length === idx;
            const si = strokeIndexOf(currentLesson.waypoints, idx);
            const sp = STROKE_PALETTE_TOKENS[si];
            const isStrokeStart = idx === 0 || currentLesson.waypoints[idx - 1].moveTo;

            // Dots are translucent tints of each stroke hue (mixed with
            // TRANSPARENT, not white) so the guide glyph's ink line shows
            // straight through them — the child sees "the stroke path runs
            // under these markers" instead of a paint patch hiding it. The
            // ring is solid for stroke identity; the number stays dark and
            // legible over the faint line. Deliberately soft so no brush
            // color ever reads as "this is a dot."
            const tintFill = `color-mix(in srgb, var(${sp.token}) 22%, transparent)`;
            let dotStyle = { borderColor: 'var(--color-slate-300)' };
            let dotClass =
              "bg-white border-slate-300 text-slate-500";
            if (editorMode && editorActive) {
              dotClass = "bg-amber-500 border-amber-600 text-ink scale-105 shadow z-20 animate-pulse cursor-move select-none";
              dotStyle = {};
            } else if (isCompleted) {
              // Done: translucent tint (glyph line still visible under it),
              // thick solid stroke-color ring — the letter accumulates a
              // small colored legend as it's drawn without masking the form.
              dotClass = "scale-90";
              dotStyle = {
                backgroundColor: tintFill,
                borderColor: `var(${sp.border})`,
                borderWidth: '3px',
              };
            } else if (isNext) {
              // Next: brighter translucent tint, pulsing halo in its stroke
              // hue — the target pops among its siblings without hiding the
              // glyph line under it. Size stays at the base 20px (no scale-up):
              // the dot must never grow bigger than the local stroke band or it
              // reads as "off the centerline" (the overhang illusion, round 10).
              dotClass = "pulse-glow-dot z-10";
              dotStyle = {
                backgroundColor: `color-mix(in srgb, var(${sp.token}) 38%, transparent)`,
                borderColor: `var(${sp.border})`,
                '--dot-glow': `var(${sp.border})`,
              };
            } else {
              // Unvisited: pale tint fill, thin dark ring. The number is
              // --color-ink in every child state (~9:1 on the lightest tint)
              // so it stays AA-legible regardless of stroke hue; identity
              // lives in the ring + fill tint, not the digit.
              dotClass = "text-ink";
              dotStyle = {
                backgroundColor: tintFill,
                borderColor: `var(${sp.border})`,
              };
            }

            // Stroke-start dots get a dashed outer ring — the "pen goes
            // down here" cue — independent of the colored fill so it
            // also works for editor mode.
            const strokeStartStyle = isStrokeStart && !(editorMode && editorActive)
              ? { borderStyle: 'dashed', borderWidth: '3px' }
              : {};

            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  // The dots are DOM, not canvas: a percentage of the
                  // wrapper is exactly what the path space already is.
                  left: `${wp.x}%`,
                  top: `${wp.y}%`,
                  transform: 'translate(-50%, -50%)',
                  ...dotStyle,
                  ...strokeStartStyle
                }}
                onMouseDown={(e) => handleWaypointMouseDown(e, idx)}
                onTouchStart={(e) => handleWaypointTouchStart(e, idx)}
                className={`w-4 h-4 rounded-full flex justify-center items-center font-bold text-[8px] leading-none shadow border-2 transition-all ${dotClass}`}
              >
                {wp.label}
              </div>
            );
          })}
        </div>

        {/* Developer Waypoint Editor Section */}
        {editorMode && (
          <WaypointEditor editor={editor} initCanvas={initCanvas} />
        )}

        {/* Kid friendly Brush toolbar */}
        <div className="flex flex-col gap-3 w-full mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">Brush Color:</span>
            <div className="flex gap-2">
              {BRUSH_TOKENS.map(c => {
                const value = themeColor(c.token);
                return (
                  <button
                    key={c.token}
                    onClick={() => setBrushColor(value)}
                    style={{ backgroundColor: `var(${c.token})` }}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${brushColor === value ? 'border-slate-800 scale-110 shadow-sm' : 'border-white hover:scale-105'}`}
                    title={c.label}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">Brush Size:</span>
            <div className="flex gap-1.5 font-sans">
              {[
                { width: 8, label: 'Thin' },
                { width: 16, label: 'Medium' },
                { width: 24, label: 'Thick' }
              ].map(s => (
                <button
                  key={s.width}
                  onClick={() => setBrushWidth(s.width)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${brushWidth === s.width ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm mt-3 text-center px-4 font-medium italic">
          {currentLesson.instructions}
        </p>

        {/* Clear and voice actions */}
        <div className="flex gap-3 w-full mt-4 font-sans">
          <button
            onClick={initCanvas}
            className="flex-1 border-3 border-slate-200 hover:border-slate-300 text-slate-600 font-extrabold py-3.5 px-4 rounded-2xl flex justify-center items-center gap-2 transition"
          >
            <RotateCcw size={18} />
            <span>Clear</span>
          </button>
          <button
            onClick={handleLessonSpeech}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3.5 px-4 rounded-2xl flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-500/20"
          >
            <Volume2 size={18} />
            <span>Speak</span>
          </button>
        </div>
      </div>
    </div>
  );
}
