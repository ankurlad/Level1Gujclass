import {
  CheckCircle,
  ChevronRight,
  Gamepad2,
  Map,
  Palette,
  Printer,
  Sparkles
} from 'lucide-react';
import InstallPromoCard from '../components/InstallPromoCard';
import { useAppStore } from '../store/appStore';

// The front door: the greeting and the five ways in. No state of its own — it
// is a menu — but it is the second place that cares whether the app is
// installed, so the install handle comes down from App as props.
export default function HomeView({ isStandalone, triggerPwaInstall }) {
  const { installDismissed, setInstallDismissed, dispatch, setView } = useAppStore();

  return (
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
        <InstallPromoCard
          onDismiss={() => setInstallDismissed(true)}
          onInstall={triggerPwaInstall}
        />
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
  );
}
