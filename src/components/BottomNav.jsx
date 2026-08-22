import { Gamepad2, Home, Map, Palette, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/appStore';

// The five-tab bar at the bottom. App decides whether it is on screen at all
// (the dashboard and the worksheet studio hide it); this decides which tab
// reads as current, which for Games is any of the five game views.
export default function BottomNav() {
  const { view, setView } = useAppStore();

  return (
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
  );
}
