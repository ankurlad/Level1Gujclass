import { Download, RefreshCw, Sparkles } from 'lucide-react';

// The two things this card ever says. PR 8 needed somewhere to announce a
// waiting service worker and this is already the app's "there is something to
// do with the installed app" surface — a second toast would be a second
// notification system for the same one-line message.
const VARIANTS = {
  install: {
    badge: Sparkles,
    title: 'Install Akshar App',
    body: 'Practice Kakko offline anytime directly on your device screen.',
    action: Download,
    actionLabel: 'Install App Now',
    dismissLabel: 'Dismiss install card'
  },
  update: {
    badge: RefreshCw,
    title: 'Update Akshar App',
    body: 'A new version is ready. Reload to switch to it — your progress stays saved.',
    action: RefreshCw,
    actionLabel: 'Reload to Update',
    dismissLabel: 'Dismiss update card'
  }
};

// The install pitch on the home screen, shown until the app is installed or
// the card is dismissed (which is remembered). The composition root owns the
// prompt itself; this is only its shopfront, which is why it takes both of its
// actions as props and reads nothing.
export default function InstallPromoCard({ onDismiss, onInstall, variant = 'install' }) {
  const { badge: Badge, title, body, action: Action, actionLabel, dismissLabel } =
    VARIANTS[variant] ?? VARIANTS.install;

  return (
    <div className="mt-6 mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 max-w-sm rounded-3xl p-5 border border-indigo-400/30 shadow-lg flex flex-col gap-3 text-left text-white animate-float relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-white p-1 rounded-full text-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={dismissLabel}
        title="Dismiss"
      >
        ✕
      </button>
      <div className="flex items-center gap-3 pr-6">
        <div className="bg-white/20 p-2.5 rounded-2xl flex-shrink-0">
          <Badge size={24} className="text-white" />
        </div>
        <div>
          <h4 className="font-extrabold text-base">{title}</h4>
          <p className="text-white text-xs font-medium">{body}</p>
        </div>
      </div>
      <button
        onClick={onInstall}
        className="w-full bg-white text-indigo-700 font-extrabold text-sm py-3 px-4 rounded-2xl hover:bg-slate-100 transition shadow-md flex items-center justify-center gap-2 min-h-[44px]"
      >
        <Action size={18} />
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}
