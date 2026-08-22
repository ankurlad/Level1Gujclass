import { Download } from 'lucide-react';

// The fallback for browsers that never fire beforeinstallprompt — iOS Safari,
// and Chrome before the engagement heuristic is satisfied. Shown by the
// composition root when usePwaInstall has no prompt to defer.
export default function InstallInstructionsModal({ onClose }) {
  return (
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
            onClick={onClose}
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
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-2xl text-sm transition shadow-md min-h-[44px]"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
