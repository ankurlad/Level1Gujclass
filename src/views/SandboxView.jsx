import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { speak } from '../lib/audio';
import { eventToCanvasCoords, setupCanvasScaling } from '../lib/canvas';
import { STICKERS } from '../lib/stickers';
import { BRUSH_TOKENS, themeColor } from '../lib/theme';
import { CANVAS_H, CANVAS_W } from '../lib/waypoints';
import { useAppStore } from '../store/appStore';

// Free drawing, with the letters and the earned stickers as stamps.
//
// It shares the brush with the tracing screen (same store keys, so a colour
// picked here is the colour the next letter is traced in) and nothing else:
// no waypoints, no scoring, no engine.
export default function SandboxView() {
  const {
    view,
    sessionCurriculum,
    unlockedStickers,
    brushColor, setBrushColor,
    brushWidth, setBrushWidth,
    setView,
    playSound
  } = useAppStore();

  // Sandbox Mode States (Idea 5)
  const [sandboxTool, setSandboxTool] = useState('draw'); // draw | stamp
  const [selectedSandboxSticker, setSelectedSandboxSticker] = useState('🪷');
  const [sandboxIsDrawing, setSandboxIsDrawing] = useState(false);
  const sandboxCanvasRef = useRef(null);
  const sandboxLastPointRef = useRef(null);

  // Sandbox Mode Canvas logic (Idea 5)
  const initSandboxCanvas = () => {
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvasScaling(canvas);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = themeColor('--color-sandbox-surface');
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const startSandboxDrawing = (e) => {
    e.preventDefault();
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;

    const { x, y } = eventToCanvasCoords(canvas, e);

    if (sandboxTool === 'stamp') {
      const ctx = canvas.getContext('2d');
      ctx.font = '44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedSandboxSticker, x, y);
      playSound('waypoint');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    
    setSandboxIsDrawing(true);
    sandboxLastPointRef.current = { x, y };
  };

  const drawSandbox = (e) => {
    if (!sandboxIsDrawing || sandboxTool !== 'draw') return;
    e.preventDefault();
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;

    const { x, y } = eventToCanvasCoords(canvas, e);

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    sandboxLastPointRef.current = { x, y };
  };

  const stopSandboxDrawing = () => {
    setSandboxIsDrawing(false);
  };

  useEffect(() => {
    if (view === 'sandbox') {
      setTimeout(() => {
        initSandboxCanvas();
      }, 50);
    }
  }, [view]);

  return (
    <div className="flex-1 flex flex-col text-center justify-center">
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => setView('home')} 
          className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
        >
          Back
        </button>
        <span className="font-bold text-slate-700 text-lg">Sticker Sandbox</span>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
        {/* Tool Mode selector */}
        <div className="flex gap-2 mb-3 w-full font-sans">
          <button
            onClick={() => setSandboxTool('draw')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${sandboxTool === 'draw' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            ✏️ Brush Draw
          </button>
          <button
            onClick={() => setSandboxTool('stamp')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${sandboxTool === 'stamp' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            🖼️ Sticker Stamp
          </button>
        </div>

        {/* Blank canvas field */}
        <div 
          style={{ position: 'relative', aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
          className="border-4 border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-white w-full max-w-[380px] flex-1 flex items-center justify-center"
        >
          <canvas
            ref={sandboxCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseDown={startSandboxDrawing}
            onMouseMove={drawSandbox}
            onMouseUp={stopSandboxDrawing}
            onMouseLeave={stopSandboxDrawing}
            onTouchStart={startSandboxDrawing}
            onTouchMove={drawSandbox}
            onTouchEnd={stopSandboxDrawing}
            className="w-full h-full cursor-pointer touch-none"
          />
        </div>

        {/* Draw Toolbar config */}
        {sandboxTool === 'draw' ? (
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
        ) : (
          /* Sticker Stamp Selection grid */
          <div className="w-full mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 block text-left mb-2">Select Stamp Emoji:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {sessionCurriculum.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedSandboxSticker(item.emoji)}
                  className={`text-2xl p-2 rounded-xl border transition flex-shrink-0 ${selectedSandboxSticker === item.emoji ? 'bg-indigo-50 border-indigo-300 scale-105 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  {item.emoji}
                </button>
              ))}
              {unlockedStickers.map(id => {
                const sticker = STICKERS.find(s => s.id === id);
                return sticker ? (
                  <button
                    key={sticker.id}
                    onClick={() => setSelectedSandboxSticker(sticker.emoji)}
                    className={`text-2xl p-2 rounded-xl border transition flex-shrink-0 ${selectedSandboxSticker === sticker.emoji ? 'bg-indigo-50 border-indigo-300 scale-105 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                  >
                    {sticker.emoji}
                  </button>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Clear and save actions */}
        <div className="flex gap-3 w-full mt-4 font-sans">
          <button
            onClick={initSandboxCanvas}
            className="flex-1 border-3 border-slate-200 hover:border-slate-300 text-slate-600 font-extrabold py-3 px-4 rounded-2xl flex justify-center items-center gap-2 transition"
          >
            <RotateCcw size={18} />
            <span>Clear Board</span>
          </button>
          <button
            onClick={() => {
              confetti({ particleCount: 50, spread: 60 });
              playSound('success');
              speak("તમારું ચિત્ર સુંદર છે!"); // Your picture is beautiful!
            }}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-2xl flex justify-center items-center gap-2 transition shadow-lg shadow-indigo-600/20"
          >
            <Sparkles size={18} />
            <span>Brag Art!</span>
          </button>
        </div>
      </div>
    </div>
  );
}
