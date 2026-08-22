import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  RotateCcw,
  CheckCircle,
  ShieldAlert,
  Lock,
  Unlock,
  Sparkles,
  Home,
  Trophy,
  Grid,
  ChevronRight,
  Palette,
  Map,
  Gamepad2,
  Download,
  Printer,
  FileText,
  CheckSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speak } from './lib/audio';
import { eventToCanvasCoords, setupCanvasScaling } from './lib/canvas';
import { createPinRecord, verifyPin } from './lib/parentPin';
import { STICKERS } from './lib/stickers';
import { BRUSH_TOKENS, themeColor } from './lib/theme';
import { CANVAS_H, CANVAS_W } from './lib/waypoints';
import { AppStoreProvider, GAME_VIEWS, useAppStore } from './store/appStore';
import GameZone from './views/GameZone';
import ParentDashboard from './views/ParentDashboard';
import StickerShop from './views/StickerShop';
import TraceView from './views/TraceView';

const WORKSHEET_GROUPS = [
  { id: 'all', name: 'All Letters (૩૪)', filter: () => true },
  { id: 'guttural', name: 'Guttural / કંઠ્ય (ક-ઙ)', filter: (item) => ['ka', 'kha', 'ga', 'gha', 'nga'].includes(item.id) },
  { id: 'palatal', name: 'Palatal / તાલવ્ય (ચ-ઞ)', filter: (item) => ['cha', 'chha', 'ja', 'jha', 'nya'].includes(item.id) },
  { id: 'retroflex', name: 'Retroflex / મૂર્ધન્ય (ટ-ણ)', filter: (item) => ['ta', 'tha', 'da', 'dha', 'ana'].includes(item.id) },
  { id: 'dental', name: 'Dental / દંત્ય (ત-ન)', filter: (item) => ['ta2', 'tha2', 'da2', 'dha2', 'na'].includes(item.id) },
  { id: 'labial', name: 'Labial / ઓષ્ઠ્ય (પ-મ)', filter: (item) => ['pa', 'pha', 'ba', 'bha', 'ma'].includes(item.id) },
  { id: 'sibilants', name: 'Semi-vowels & Sibilants (ય-જ્ઞ)', filter: (item) => ['ya', 'ra', 'la', 'va', 'sha', 'ssa', 'sa', 'ha', 'la2', 'ksha', 'gna'].includes(item.id) }
];

function AppShell() {
  const {
    view,
    sessionCurriculum,
    gateTarget,
    worksheetMode,
    selectedWorksheetLetter,
    worksheetGroup,
    worksheetFromView,
    dispatch,
    points,
    progressLog,
    unlockedStickers,
    brushColor, setBrushColor,
    brushWidth, setBrushWidth,
    installDismissed, setInstallDismissed,
    gateType,
    parentPinRecord, setParentPinRecord,
    parentUnlockAll,
    setView,
    playSound
  } = useAppStore();

  // Transitional shims. Every section below still calls the setters App used to
  // own; they are removed one at a time as each section moves into its own view
  // and starts dispatching for itself.
  const setCurrentLessonIndex = (index) => dispatch({ type: 'lesson/select', index });
  const setWorksheetMode = (mode) => dispatch({ type: 'worksheets/setMode', worksheetMode: mode });
  const setWorksheetGroup = (group) => dispatch({ type: 'worksheets/setGroup', worksheetGroup: group });
  const setSelectedWorksheetLetter = (letter) =>
    dispatch({ type: 'worksheets/setLetter', selectedWorksheetLetter: letter });
  const showParentLock = gateTarget !== null;
  const parentLockTarget = gateTarget;
  const setShowParentLock = (open) => { if (!open) dispatch({ type: 'gate/cancel' }); };
  const setParentLockTarget = (target) => dispatch({ type: 'gate/request', target });

  // PWA Install States & Handlers
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [lockAnswer, setLockAnswer] = useState('');
  const [lockQuestion, setLockQuestion] = useState({ q: '', a: 0 });

  // PWA & Installation states
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [kioskPromptActive, setKioskPromptActive] = useState(false);

  // Sandbox Mode States (Idea 5)
  const [sandboxTool, setSandboxTool] = useState('draw'); // draw | stamp
  const [selectedSandboxSticker, setSelectedSandboxSticker] = useState('🪷');
  const [sandboxIsDrawing, setSandboxIsDrawing] = useState(false);
  const sandboxCanvasRef = useRef(null);
  const sandboxLastPointRef = useRef(null);

  // Listen to installation prompt event, appinstalled, and check standalone display mode
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches || 
                                window.matchMedia('(display-mode: fullscreen)').matches || 
                                window.matchMedia('(display-mode: minimal-ui)').matches;
      const isNavStandalone = window.navigator.standalone === true || (document.referrer && document.referrer.includes('android-app://'));
      return isStandaloneMedia || isNavStandalone;
    };
    setIsStandalone(checkStandalone());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const triggerPwaInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
      return;
    }
    setShowInstallModal(true);
  };

  // Math lock generator
  const generateLockQuestion = () => {
    const num1 = Math.floor(Math.random() * 8) + 6;
    const num2 = Math.floor(Math.random() * 7) + 4;
    setLockQuestion({
      q: `What is ${num1} + ${num2}?`,
      a: num1 + num2
    });
    setLockAnswer('');
  };

  const openParentView = () => {
    setShowParentLock(false);
    setView(parentLockTarget);
    setLockAnswer('');
  };

  const handleParentLockVerify = async (e) => {
    e.preventDefault();
    if (gateType === 'math') {
      if (parseInt(lockAnswer, 10) === lockQuestion.a) {
        openParentView();
        return;
      }
      playSound('wrong');
      alert("Incorrect answer! Try again.");
      generateLockQuestion();
      return;
    }

    // First run on the PIN gate: there is no stored passcode to check against,
    // so whatever is typed here becomes it. PR 11 gives this its own screen
    // with a confirmation field; this keeps the gate usable without shipping a
    // passcode that is the same on every install.
    if (!parentPinRecord) {
      if (!/^\d{4}$/.test(lockAnswer)) {
        playSound('wrong');
        alert("Choose a 4-digit passcode for this section.");
        return;
      }
      try {
        setParentPinRecord(await createPinRecord(lockAnswer));
      } catch (err) {
        console.error('Could not hash the parent passcode', err);
        alert("This device cannot store a passcode securely. Use the math gate instead.");
        return;
      }
      openParentView();
      return;
    }

    let matches = false;
    try {
      matches = await verifyPin(lockAnswer, parentPinRecord);
    } catch (err) {
      console.error('Could not check the parent passcode', err);
      alert("This device cannot check the passcode. Use the math gate instead.");
      return;
    }

    if (matches) {
      openParentView();
      return;
    }

    playSound('wrong');
    alert("Incorrect Passcode! Try again.");
    setLockAnswer('');
  };

  const requestParentView = (targetView) => {
    setParentLockTarget(targetView);
    setLockAnswer('');
    setTempPasscode('');
    if (gateType === 'math') {
      generateLockQuestion();
    }
    setShowParentLock(true);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setFullscreenActive(false));
      }
      return;
    }

    document.documentElement.requestFullscreen().then(() => {
      setFullscreenActive(true);
    }).catch(err => {
      console.error("Fullscreen lock failed", err);
    });
  };

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
    <div className="flex flex-col min-h-screen">
      {/* Kiosk Mode Simulation */}
      {kioskPromptActive && (
        <div className="kiosk-lock-overlay">
          <div className="bg-white text-slate-800 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl">
            <ShieldAlert size={48} className="text-rose-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold mb-2">Device is Locked!</h3>
            <p className="text-slate-600 mb-6">Ask your parents to enter the passcode to exit Kiosk / Single App mode.</p>
            <button 
              onClick={() => setKioskPromptActive(false)} 
              className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-700 transition"
            >
              Continue Learning
            </button>
          </div>
        </div>
      )}

      {/* Parent Verification Modal */}
      {showParentLock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border-4 border-amber-400">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <Lock size={28} />
              <h3 className="text-2xl font-bold">Parents Section</h3>
            </div>
            <p className="text-slate-600 mb-4 font-medium text-lg">
              {gateType === 'math'
                ? 'Solve this math sum to verify:'
                : parentPinRecord
                  ? 'Enter your 4-digit passcode:'
                  : 'Choose a 4-digit passcode to protect this section:'}
            </p>
            
            <form onSubmit={handleParentLockVerify}>
              {gateType === 'math' ? (
                <div className="bg-slate-100 p-4 rounded-xl text-center mb-4">
                  <span className="text-2xl font-bold text-slate-800">{lockQuestion.q}</span>
                </div>
              ) : null}
              <input 
                type={gateType === 'math' ? 'number' : 'password'}
                maxLength={gateType === 'pin' ? 4 : undefined}
                value={lockAnswer} 
                onChange={(e) => setLockAnswer(e.target.value)}
                placeholder={gateType === 'math' ? 'Enter answer' : (parentPinRecord ? 'Enter PIN' : 'Set a PIN')}
                className="w-full border-3 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-center text-xl font-bold mb-6"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowParentLock(false)}
                  className="flex-1 border-3 border-slate-200 hover:border-slate-300 font-bold py-3 rounded-xl transition text-slate-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 flex justify-between items-center shadow-sm">
        <button 
          className="flex items-center gap-2.5 cursor-pointer bg-transparent border-0 p-0 text-left transition hover:opacity-90" 
          onClick={() => setView('home')}
          aria-label="Akshar PWA Home"
        >
          <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white w-9 h-9 rounded-xl flex justify-center items-center text-xl font-gujarati shadow-sm">
            અ
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-800">
            Akshar PWA
          </span>
        </button>
        
        <div className="flex items-center gap-2">
          {!isStandalone && (
            <button 
              onClick={triggerPwaInstall}
              className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition min-h-[44px] min-w-[44px]"
              aria-label="Install Akshar PWA"
              title="Install Akshar PWA on your device"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          <div className="bg-amber-50 text-amber-800 border border-amber-200/80 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold text-xs shadow-sm animate-float">
            <Trophy size={15} className="text-amber-500 fill-amber-400" />
            <span>{points} Pts</span>
          </div>

          <button 
            onClick={toggleFullscreen}
            className={`min-w-[44px] min-h-[44px] p-2 rounded-xl transition-all border flex items-center justify-center ${fullscreenActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:bg-slate-200/80'}`}
            title="Lock Single App Mode"
            aria-label="Toggle Single App Mode"
          >
            {fullscreenActive ? <Lock size={18} /> : <Unlock size={18} />}
          </button>

          <button 
            onClick={() => requestParentView('dashboard')}
            className={`min-w-[44px] min-h-[44px] p-2 rounded-xl border flex items-center justify-center transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:bg-slate-200/80'}`}
            title="Parents Settings"
            aria-label="Parent Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col p-4 bg-kids-pattern overflow-y-auto">
        {view === 'home' && (
          <div className="flex-1 flex flex-col justify-center py-6 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden shadow-xl mb-4 border-4 border-white animate-bounce-slow bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex justify-center items-center">
                <span className="text-white text-5xl font-gujarati">ક</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Kem Chho! 👋</h1>
              <p className="text-slate-500 font-medium text-lg px-6">Ready to learn the Gujarati alphabet and earn lovely stickers?</p>
            </div>

            {/* Menu options */}
            <div className="grid gap-4 max-w-sm w-full mx-auto px-4">
              <button 
                onClick={() => setView('map')}
                className="btn-tactile-indigo text-white font-extrabold text-lg py-4 px-6 rounded-3xl flex items-center justify-between shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Map size={24} />
                  </div>
                  <span>Start Akshar Path</span>
                </div>
                <ChevronRight size={22} />
              </button>

              <button 
                onClick={() => setView('games')}
                className="btn-tactile-amber text-ink font-extrabold text-lg py-4 px-6 rounded-3xl flex items-center justify-between shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Gamepad2 size={24} />
                  </div>
                  <span>Interactive Game Zone</span>
                </div>
                <ChevronRight size={22} />
              </button>

              <button 
                onClick={() => setView('sandbox')}
                className="btn-tactile-rose text-white font-extrabold text-lg py-4 px-6 rounded-3xl flex items-center justify-between shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Palette size={24} />
                  </div>
                  <span>Creative Sandbox</span>
                </div>
                <ChevronRight size={22} />
              </button>

              <button 
                onClick={() => setView('stickers')}
                className="btn-tactile-emerald text-ink font-extrabold text-lg py-4 px-6 rounded-3xl flex items-center justify-between shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Sparkles size={24} />
                  </div>
                  <span>Sticker Shop</span>
                </div>
                <ChevronRight size={22} />
              </button>

              <button 
                onClick={() => dispatch({ type: 'worksheets/open', from: 'home' })}
                className="btn-tactile-indigo text-white font-extrabold text-lg py-4 px-6 rounded-3xl flex items-center justify-between shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Printer size={24} />
                  </div>
                  <span>Printable Worksheets</span>
                </div>
                <ChevronRight size={22} />
              </button>
            </div>

            {/* PWA Promo Install Banner */}
            {!isStandalone && !installDismissed && (
              <div className="mt-6 mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 max-w-sm rounded-3xl p-5 border border-indigo-400/30 shadow-lg flex flex-col gap-3 text-left text-white animate-float relative">
                <button
                  onClick={() => setInstallDismissed(true)}
                  className="absolute top-2 right-2 text-white p-1 rounded-full text-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Dismiss install card"
                  title="Dismiss"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3 pr-6">
                  <div className="bg-white/20 p-2.5 rounded-2xl flex-shrink-0">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Install Akshar App</h4>
                    <p className="text-white text-xs font-medium">Practice Kakko offline anytime directly on your device screen.</p>
                  </div>
                </div>
                <button
                  onClick={triggerPwaInstall}
                  className="w-full bg-white text-indigo-700 font-extrabold text-sm py-3 px-4 rounded-2xl hover:bg-slate-100 transition shadow-md flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Download size={18} />
                  <span>Install App Now</span>
                </button>
              </div>
            )}

            {/* Offline notification card */}
            <div className="mt-8 mx-auto bg-white max-w-sm rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 text-left">
              <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-full flex justify-center items-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Works Completely Offline!</h4>
                <p className="text-slate-500 text-xs">Practice Kakko and trace letters anywhere without internet access.</p>
              </div>
            </div>
          </div>
        )}

        {view === 'map' && (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>🗺️ Akshar Path</span>
              </h2>
              <div className="text-xs bg-indigo-100 text-indigo-700 font-extrabold px-3 py-1.5 rounded-full font-sans">
                {progressLog.completedLessons.length} / 34 Cleared
              </div>
            </div>
            
            {/* Scrollable Map Container */}
            <div className="flex-1 overflow-y-auto pr-1 pb-10 relative bg-slate-50/50 rounded-3xl border border-slate-100 p-4 shadow-inner max-w-md mx-auto w-full min-h-[400px]">
              {/* Adventure Path Line */}
              <div className="absolute left-1/2 top-4 bottom-10 w-1.5 border-l-4 border-dashed border-indigo-200 -translate-x-1/2 z-0" />
              
              <div className="flex flex-col gap-2.5 relative z-10">
                {sessionCurriculum.map((item, idx) => {
                  const isCompleted = progressLog.completedLessons.includes(item.id);
                  const isLocked = idx > 0 && 
                                   !progressLog.completedLessons.includes(sessionCurriculum[idx - 1].id) && 
                                   parentUnlockAll !== true;
                  const isActive = !isLocked && !isCompleted;
                  
                  const alignment = idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse';
                  const translateOffset = idx % 2 === 0 ? 'translate-x-6' : '-translate-x-6';
                  
                  let stoneStyle = "bg-white border-slate-200 text-slate-800 shadow-md hover:scale-105 active:scale-95";
                  let badgeIcon = null;
                  
                  if (isLocked) {
                    stoneStyle = "bg-slate-200 border-slate-300 text-slate-600 cursor-not-allowed opacity-90";
                    badgeIcon = <Lock size={12} className="text-slate-500" />;
                  } else if (isActive) {
                    stoneStyle = "bg-indigo-600 border-indigo-700 text-white scale-110 shadow-lg shadow-indigo-600/30 animate-bounce-slow cursor-pointer ring-4 ring-indigo-100";
                    badgeIcon = <Sparkles size={12} className="text-white" />;
                  } else if (isCompleted) {
                    stoneStyle = "bg-emerald-700 border-emerald-800 text-white shadow-md cursor-pointer hover:bg-emerald-800";
                    badgeIcon = <CheckCircle size={12} className="text-white" />;
                  }
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-center w-full ${alignment}`}
                    >
                      <button
                        disabled={isLocked}
                        onClick={() => {
                          setCurrentLessonIndex(idx);
                          setView('learn');
                          playSound('waypoint');
                        }}
                        className={`w-16 h-16 rounded-full flex flex-col justify-center items-center text-2xl border-4 transition-all duration-300 relative ${stoneStyle}`}
                      >
                        <span className="font-gujarati text-2xl">{item.letter}</span>
                        {badgeIcon && (
                          <div className="absolute -top-1 -right-1 bg-slate-800 rounded-full p-1 border-2 border-white shadow-sm flex items-center justify-center">
                            {badgeIcon}
                          </div>
                        )}
                      </button>
                      
                      <div className={`w-32 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 ${translateOffset} transition-all duration-300 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
                        <span className="text-xl">{item.emoji}</span>
                        <div className="flex flex-col text-left font-sans">
                          <span className="font-extrabold text-xs text-slate-800 leading-tight">{item.english}</span>
                          <span className="text-xxs text-slate-500 font-bold truncate leading-none mt-0.5">{item.wordEnglish}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'learn' && <TraceView />}

        {GAME_VIEWS.includes(view) && <GameZone />}

        {view === 'sandbox' && (
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
        )}

        {view === 'stickers' && <StickerShop />}

        {view === 'dashboard' && <ParentDashboard />}

        {view === 'worksheets' && (
          <div className="flex-1 flex flex-col">
            {/* Top Interactive Controls (Hidden during print) */}
            <div className="no-print print-hide mb-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setView(worksheetFromView || 'dashboard')}
                  className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex items-center gap-1.5"
                >
                  <span>← Back</span>
                </button>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <span>🖨️ Printable Worksheets</span>
                </h3>
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95 text-sm"
                  title="Print or Save as PDF"
                >
                  <Printer size={16} />
                  <span>Print</span>
                </button>
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                <button
                  onClick={() => setWorksheetMode('single')}
                  className={`flex-1 py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${worksheetMode === 'single' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <FileText size={14} />
                  <span>Single Letter</span>
                </button>
                <button
                  onClick={() => setWorksheetMode('grid')}
                  className={`flex-1 py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${worksheetMode === 'grid' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <Grid size={14} />
                  <span>Kakko Grid</span>
                </button>
                <button
                  onClick={() => setWorksheetMode('match')}
                  className={`flex-1 py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${worksheetMode === 'match' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  <CheckSquare size={14} />
                  <span>Match Activity</span>
                </button>
              </div>

              {/* Category & Letter Selection (For Single Letter and Match modes) */}
              {worksheetMode !== 'grid' && (
                <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xs">
                  {/* Category Pills */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {WORKSHEET_GROUPS.map(grp => (
                      <button
                        key={grp.id}
                        onClick={() => setWorksheetGroup(grp.id)}
                        className={`text-xxs font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition ${worksheetGroup === grp.id ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {grp.name}
                      </button>
                    ))}
                  </div>

                  {/* Letter Carousel (for Single mode) */}
                  {worksheetMode === 'single' && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                      {sessionCurriculum
                        .filter(WORKSHEET_GROUPS.find(g => g.id === worksheetGroup)?.filter || (() => true))
                        .map(item => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedWorksheetLetter(item.id)}
                            className={`min-w-[44px] min-h-[44px] rounded-xl font-bold flex justify-center items-center border transition-all text-sm flex-shrink-0 ${selectedWorksheetLetter === item.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                          >
                            <span className="font-gujarati">{item.letter}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Printable Paper Area */}
            {(() => {
              const activeItem = sessionCurriculum.find(l => l.id === selectedWorksheetLetter) || sessionCurriculum[0];
              
              if (worksheetMode === 'single') {
                return (
                  <div id="printable-worksheet" className="worksheet-a4-page text-slate-900 bg-white">
                    {/* Header bar matching Gujarati Learner layout */}
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
                      <div className="w-10"></div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">
                        Gujarati Letter <span className="uppercase text-indigo-800">{activeItem.english}</span> Activity Sheet
                      </h2>
                      <div className="bg-slate-100 border border-slate-300 rounded-full w-9 h-9 flex items-center justify-center font-gujarati text-lg font-bold text-slate-700 shadow-xs">
                        {activeItem.letter}
                      </div>
                    </div>

                    {/* Section 1: Color Activity */}
                    <div className="flex items-stretch gap-3 my-1">
                      <div className="worksheet-vertical-label text-slate-900 text-sm font-black py-4 w-7 flex items-center justify-center">
                        Color Activity
                      </div>
                      <div className="grid grid-cols-2 gap-3.5 flex-1">
                        {/* Box 1 */}
                        <div className="color-activity-box">
                          <div className="w-full text-right font-black text-2xl text-slate-900 tracking-wide pr-1">
                            {activeItem.english.toUpperCase()}
                          </div>
                          <div className="my-auto py-2 flex items-center justify-center">
                            <span className="hollow-gujarati-char">{activeItem.letter}</span>
                          </div>
                        </div>

                        {/* Box 2 */}
                        <div className="color-activity-box">
                          <div className="w-full text-right font-black text-2xl text-slate-900 tracking-wide pr-1">
                            {activeItem.english.toUpperCase()}
                          </div>
                          <div className="my-auto py-2 flex items-center justify-center">
                            <span className="hollow-gujarati-char">{activeItem.letter}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Tracing Activity */}
                    <div className="flex items-stretch gap-3 my-1">
                      <div className="worksheet-vertical-label text-slate-900 text-sm font-black py-4 w-7 flex items-center justify-center">
                        Tracing Activity
                      </div>
                      <div className="grid grid-cols-4 gap-2.5 flex-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                          <div key={i} className="tracing-cell">
                            <span className="tracing-gujarati-char">{activeItem.letter}</span>
                            {i === 1 && (
                              <span className="absolute top-1 left-2 text-xxs font-extrabold text-slate-500">1 ➔</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: Educational Footer */}
                    <div className="border-t border-slate-300 pt-2 mt-auto flex flex-col gap-1 text-center text-xs text-slate-700">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800 px-2">
                        <span>Name: <span className="inline-block w-36 border-b border-slate-400"></span></span>
                        <span>Date: <span className="inline-block w-24 border-b border-slate-400"></span></span>
                        <span>Word: <strong className="font-gujarati text-sm text-indigo-700">{activeItem.word}</strong> ({activeItem.wordEnglish} {activeItem.emoji})</span>
                      </div>
                      <div className="text-xxs text-slate-500 font-semibold mt-1">
                        Akshar Gujarati Learner • Free Printable Handwriting Practice • https://level1gujclass.vercel.app
                      </div>
                    </div>
                  </div>
                );
              }

              if (worksheetMode === 'grid') {
                return (
                  <div id="printable-worksheet" className="worksheet-a4-page text-slate-900 bg-white">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
                      <div className="flex-1 text-center">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Complete Kakko Tracing Sheet (ક થી જ્ઞ)</h2>
                        <span className="text-xxs font-bold text-slate-500 uppercase tracking-wider">All 34 Gujarati Consonants</span>
                      </div>
                      <div className="text-right text-xs font-bold text-slate-700">
                        <div>Name: <span className="inline-block w-24 border-b border-slate-400"></span></div>
                        <div className="mt-1">Date: <span className="inline-block w-16 border-b border-slate-400"></span></div>
                      </div>
                    </div>

                    {/* 6x6 Alphabet Grid */}
                    <div className="grid grid-cols-6 gap-2 my-1">
                      {sessionCurriculum.map(item => (
                        <div key={item.id} className="border border-slate-300 rounded-xl p-1.5 flex flex-col items-center justify-between text-center bg-white shadow-2xs min-h-[70px]">
                          <span className="text-xxs font-extrabold text-slate-500 leading-none">{item.english}</span>
                          <span className="tracing-gujarati-char text-3xl my-0.5" style={{ fontSize: '32px' }}>{item.letter}</span>
                          <span className="text-xxs text-slate-500 truncate max-w-full leading-none font-bold">{item.emoji} {item.word}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer remarks */}
                    <div className="mt-auto border-t border-slate-300 pt-2 flex justify-between items-center text-xs text-slate-600">
                      <div>
                        <span>Teacher / Parent Signature: </span>
                        <span className="inline-block w-36 border-b border-slate-400"></span>
                      </div>
                      <div className="font-bold text-indigo-700">
                        <span>શાબાશ! Well Done! ⭐⭐⭐⭐⭐</span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (worksheetMode === 'match') {
                const groupFilter = WORKSHEET_GROUPS.find(g => g.id === worksheetGroup)?.filter || (() => true);
                const filtered = sessionCurriculum.filter(groupFilter);
                const list = filtered.length >= 6 ? filtered.slice(0, 6) : sessionCurriculum.slice(0, 6);
                // Deterministic reverse shuffle for matching exercise
                const shuffled = [...list].reverse();

                return (
                  <div id="printable-worksheet" className="worksheet-a4-page text-slate-900 bg-white">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
                      <div className="flex-1 text-center">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Match the Letter with Picture (અક્ષર અને ચિત્ર જોડો)</h2>
                        <span className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Akshar Activity Series</span>
                      </div>
                      <div className="text-right text-xs font-bold text-slate-700">
                        <div>Name: <span className="inline-block w-24 border-b border-slate-400"></span></div>
                        <div className="mt-1">Date: <span className="inline-block w-16 border-b border-slate-400"></span></div>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                      ✏️ Instructions: Draw a pencil line connecting each Gujarati letter on the left to its matching picture on the right.
                    </p>

                    {/* Matching Columns */}
                    <div className="grid grid-cols-2 gap-8 my-2">
                      {/* Left column: Letters */}
                      <div className="flex flex-col gap-3">
                        {list.map(item => (
                          <div key={item.id} className="border-2 border-slate-300 rounded-2xl p-3 flex items-center justify-between bg-white shadow-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-gujarati text-2xl font-bold text-slate-900">{item.letter}</span>
                              <span className="text-xs text-slate-500 font-bold">({item.english})</span>
                            </div>
                            <div className="w-4 h-4 rounded-full border-2 border-indigo-600 bg-white" />
                          </div>
                        ))}
                      </div>

                      {/* Right column: Shuffled Pictures */}
                      <div className="flex flex-col gap-3">
                        {shuffled.map(item => (
                          <div key={item.id} className="border-2 border-slate-300 rounded-2xl p-3 flex items-center justify-between bg-white shadow-xs">
                            <div className="w-4 h-4 rounded-full border-2 border-indigo-600 bg-white" />
                            <div className="flex items-center gap-2.5 text-right">
                              <div>
                                <div className="font-gujarati text-sm font-bold text-slate-800">{item.word}</div>
                                <div className="text-xxs text-slate-500 font-bold">{item.wordEnglish}</div>
                              </div>
                              <span className="text-3xl">{item.emoji}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer remarks */}
                    <div className="mt-auto border-t border-slate-200 pt-3 flex justify-between items-center text-xs text-slate-600">
                      <div>
                        <span>Teacher / Parent Signature: </span>
                        <span className="inline-block w-40 border-b border-slate-400 border-dashed"></span>
                      </div>
                      <div className="font-bold text-amber-700">
                        <span>Score: _____ / {list.length} ⭐</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}
      </main>

      {/* Footer Nav Bar */}
      {view !== 'dashboard' && view !== 'worksheets' && (
        <nav 
          aria-label="Main Navigation" 
          className="mx-3 mb-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xl px-2 py-1.5 flex justify-around items-center sticky bottom-2 z-30"
        >
          <button 
            onClick={() => setView('home')} 
            aria-label="Home view"
            aria-current={view === 'home' ? 'page' : undefined}
            className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${view === 'home' ? 'bg-indigo-600 text-white font-extrabold shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Home size={18} />
            <span className="text-xxs font-bold">Home</span>
          </button>
          
          <button 
            onClick={() => setView('map')} 
            aria-label="Trace lessons map"
            aria-current={view === 'map' || view === 'learn' ? 'page' : undefined}
            className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${view === 'map' || view === 'learn' ? 'bg-indigo-600 text-white font-extrabold shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Map size={18} />
            <span className="text-xxs font-bold">Trace</span>
          </button>

          <button 
            onClick={() => setView('games')} 
            aria-label="Interactive games"
            aria-current={['games', 'match', 'quiz', 'phonics_game', 'memory_match'].includes(view) ? 'page' : undefined}
            className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${['games', 'match', 'quiz', 'phonics_game', 'memory_match'].includes(view) ? 'bg-indigo-600 text-white font-extrabold shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Gamepad2 size={18} />
            <span className="text-xxs font-bold">Games</span>
          </button>

          <button 
            onClick={() => setView('sandbox')} 
            aria-label="Creative drawing sandbox"
            aria-current={view === 'sandbox' ? 'page' : undefined}
            className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${view === 'sandbox' ? 'bg-indigo-600 text-white font-extrabold shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Palette size={18} />
            <span className="text-xxs font-bold">Sandbox</span>
          </button>

          <button 
            onClick={() => setView('stickers')} 
            aria-label="Sticker shop"
            aria-current={view === 'stickers' ? 'page' : undefined}
            className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${view === 'stickers' ? 'bg-indigo-600 text-white font-extrabold shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Sparkles size={18} />
            <span className="text-xxs font-bold">Shop</span>
          </button>
        </nav>
      )}

      {/* PWA Installation Instructions Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-left animate-fluent-slide-in">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
                  <Download size={20} />
                </div>
                <h3 className="font-extrabold text-lg text-slate-800">Install Akshar App</h3>
              </div>
              <button 
                onClick={() => setShowInstallModal(false)}
                className="text-slate-500 hover:text-slate-600 font-bold p-1 text-sm rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 text-sm font-medium mb-4">
              Add Akshar Gujarati Learner directly to your device home screen for 100% offline access:
            </p>

            <div className="space-y-3 mb-6 font-sans">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <h4 className="font-extrabold text-xs text-indigo-600 uppercase tracking-wide mb-1">📱 iOS (iPhone / iPad)</h4>
                <p className="text-xs text-slate-600 font-medium">
                  Tap the <strong>Share button</strong> in Safari, then scroll down and select <strong>'Add to Home Screen'</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <h4 className="font-extrabold text-xs text-emerald-700 uppercase tracking-wide mb-1">🤖 Android & Chrome</h4>
                <p className="text-xs text-slate-600 font-medium">
                  Tap the browser menu <strong>(⋮)</strong>, then select <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <h4 className="font-extrabold text-xs text-purple-600 uppercase tracking-wide mb-1">💻 Desktop (Chrome / Edge)</h4>
                <p className="text-xs text-slate-600 font-medium">
                  Click the <strong>Install icon</strong> in the right corner of your address bar.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-2xl text-sm transition shadow-md min-h-[44px]"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  return (
    <AppStoreProvider>
      <AppShell />
    </AppStoreProvider>
  );
}