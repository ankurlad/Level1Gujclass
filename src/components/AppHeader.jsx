import { useState } from 'react';
import { Download, Lock, Settings, Trophy, Unlock } from 'lucide-react';
import { useAppStore } from '../store/appStore';

// The bar across the top: home, install, the points badge, the kiosk-mode lock
// and the way in to the parents' room.
//
// It lives in components/ rather than in the composition root because it holds
// one piece of state of its own — whether the document is in fullscreen — and
// because App is now short enough to read in one screen, which is the point of
// the split. The install props come from usePwaInstall in App, so the header
// and the promo card on the home screen agree about what is installed.
export default function AppHeader({ isStandalone, triggerPwaInstall }) {
  const { view, points, setView, dispatch } = useAppStore();

  const [fullscreenActive, setFullscreenActive] = useState(false);

  const requestParentView = (targetView) => {
    dispatch({ type: 'gate/request', target: targetView });
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

  return (
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
  );
}
