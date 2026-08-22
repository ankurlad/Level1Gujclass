import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import InstallInstructionsModal from './components/InstallInstructionsModal';
import InstallPromoCard from './components/InstallPromoCard';
import ParentGate from './components/ParentGate';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import { AppStoreProvider, GAME_VIEWS, useAppStore } from './store/appStore';
import GameZone from './views/GameZone';
import HomeView from './views/HomeView';
import LessonMap from './views/LessonMap';
import ParentDashboard from './views/ParentDashboard';
import SandboxView from './views/SandboxView';
import StickerShop from './views/StickerShop';
import TraceView from './views/TraceView';
import WorksheetsView from './views/WorksheetsView';

// The composition root.
//
// Everything that was in here before PR 7 is now in src/views (one file per
// screen), src/components (the chrome that is on screen whatever the view is)
// or src/store/appStore.js (the state more than one of them touches). What is
// left is the page frame and the switch: which view is on screen, whether the
// parent gate is in front of it, and whether the nav bar is under it.
function AppShell() {
  const { view, gateTarget } = useAppStore();
  const { isStandalone, showInstallModal, setShowInstallModal, triggerPwaInstall } = usePwaInstall();
  const { updateReady, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();
  const [kioskPromptActive, setKioskPromptActive] = useState(false);

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
      {gateTarget !== null && <ParentGate />}

      {/* Header bar */}
      <AppHeader isStandalone={isStandalone} triggerPwaInstall={triggerPwaInstall} />

      {/* Main View Area.

          Each branch is wrapped in its own ErrorBoundary, one per screen rather
          than one around the switch: a boundary catches for its subtree, so a
          single one out here would replace the view *and* leave the nav bar as
          the only way out of a card that had already lost the view it names.
          Per-screen, a broken screen is a screen — the header still counts
          points, the nav still navigates, and the other seven are unaffected.
          The label is what the console line says when one of them throws. */}
      <main className="flex-1 flex flex-col p-4 bg-kids-pattern overflow-y-auto">
        {view === 'home' && (
          <ErrorBoundary label="home">
            <HomeView isStandalone={isStandalone} triggerPwaInstall={triggerPwaInstall} />
          </ErrorBoundary>
        )}

        {view === 'map' && (
          <ErrorBoundary label="letter map">
            <LessonMap />
          </ErrorBoundary>
        )}

        {view === 'learn' && (
          <ErrorBoundary label="tracing">
            <TraceView />
          </ErrorBoundary>
        )}

        {GAME_VIEWS.includes(view) && (
          <ErrorBoundary label="games">
            <GameZone />
          </ErrorBoundary>
        )}

        {view === 'sandbox' && (
          <ErrorBoundary label="drawing">
            <SandboxView />
          </ErrorBoundary>
        )}

        {view === 'stickers' && (
          <ErrorBoundary label="sticker shop">
            <StickerShop />
          </ErrorBoundary>
        )}

        {view === 'dashboard' && (
          <ErrorBoundary label="parents room">
            <ParentDashboard />
          </ErrorBoundary>
        )}

        {view === 'worksheets' && (
          <ErrorBoundary label="worksheets">
            <WorksheetsView />
          </ErrorBoundary>
        )}

        {/* A waiting service worker, announced on the home screen and nowhere
            else. Offering it inside a lesson is how the old autoUpdate reload
            took the canvas out from under a child mid-letter; here the reload
            only ever happens because someone chose it from the way out. */}
        {view === 'home' && updateReady && (
          <InstallPromoCard
            variant="update"
            onDismiss={dismissUpdate}
            onInstall={applyUpdate}
          />
        )}
      </main>

      {/* Footer Nav Bar */}
      {view !== 'dashboard' && view !== 'worksheets' && <BottomNav />}

      {/* PWA Installation Instructions Modal */}
      {showInstallModal && (
        <InstallInstructionsModal onClose={() => setShowInstallModal(false)} />
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
