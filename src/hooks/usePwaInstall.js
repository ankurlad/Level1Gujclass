import { useEffect, useState } from 'react';

// Whether the app is already installed, and how to ask.
//
// Two consumers, which is why it is a hook and not view state: the header's
// Install button and the promo card on the home screen. Both need the same
// `isStandalone` answer and the same deferred beforeinstallprompt event, and
// the instructions modal is the fallback for the browsers that never fire it.
export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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

  return { isStandalone, showInstallModal, setShowInstallModal, triggerPwaInstall };
}
