import { useEffect, useRef, useState } from 'react';
import { Printer, RotateCcw, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWaypointEditor } from '../hooks/useWaypointEditor';
import { speak } from '../lib/audio';
import { canvasRefCoords, setupCanvasScaling } from '../lib/canvas';
import { BRUSH_TOKENS, themeColor } from '../lib/theme';
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
  useEffect(() => {
    if (view === 'learn') {
      if (document.fonts) {
        document.fonts.ready.then(() => {
          initCanvas();
        });
      } else {
        initCanvas();
      }
    }
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

    // Guide letter in huge light grey font
    ctx.font = '220px "Noto Sans Gujarati", "Baloo Bhai 2", sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentLesson.letter, CANVAS_W / 2, CANVAS_H / 2 + 10);

    // Draw dashed guide paths connecting waypoints (respecting moveTo skips).
    // Waypoints are 0-100, so each one is scaled by the logical canvas size
    // here — the one place the path space becomes pixels for the guide.
    if (currentLesson.waypoints && currentLesson.waypoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = themeColor(
        editorMode && editorActive ? '--color-trace-path-editor' : '--color-trace-path'
      );
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 6]);
      ctx.moveTo(pathToCanvasX(currentLesson.waypoints[0].x), pathToCanvasY(currentLesson.waypoints[0].y));
      for (let i = 1; i < currentLesson.waypoints.length; i++) {
        const wp = currentLesson.waypoints[i];
        if (wp.moveTo) {
          ctx.moveTo(pathToCanvasX(wp.x), pathToCanvasY(wp.y));
        } else {
          ctx.lineTo(pathToCanvasX(wp.x), pathToCanvasY(wp.y));
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
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
          className="border-4 border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-slate-100 w-full max-w-[380px] flex-1 flex items-center justify-center"
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

          {/* Guidance Waypoints */}
          {currentLesson.waypoints.map((wp, idx) => {
            const isCompleted = completedWaypoints.includes(idx);
            const isNext = completedWaypoints.length === idx;
            
            let dotClass = "bg-white border-slate-300 text-slate-500";
            if (editorMode && editorActive) {
              dotClass = "bg-amber-500 border-amber-600 text-ink scale-105 shadow z-20 animate-pulse cursor-move select-none";
            } else if (isCompleted) {
              dotClass = "bg-emerald-700 border-emerald-800 text-white scale-90";
            } else if (isNext) {
              dotClass = "bg-indigo-600 border-indigo-700 text-white pulse-glow-dot scale-110 z-10";
            }

            // Dash border indicator for moveTo starting new strokes
            const strokeStyle = wp.moveTo
              ? { borderStyle: 'dashed', borderWidth: '3px', borderColor: 'var(--color-primary)' }
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
                  ...strokeStyle
                }}
                onMouseDown={(e) => handleWaypointMouseDown(e, idx)}
                onTouchStart={(e) => handleWaypointTouchStart(e, idx)}
                className={`w-8 h-8 rounded-full flex justify-center items-center font-bold text-xs shadow border-2 transition-all ${dotClass}`}
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
