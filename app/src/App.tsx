import { useEffect, useRef } from 'react';
import { LoadingOverlay } from './components/LoadingOverlay';
import { PrivacyScreen } from './components/PrivacyScreen';
import { APP_MARKUP } from './legacy/appMarkup';

export function App() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      await import('./services/firebase');
      const { initLegacyEngine } = await import('./legacy/engine.js');
      initLegacyEngine();
    })();
  }, []);

  return (
    <>
      <LoadingOverlay />
      <div dangerouslySetInnerHTML={{ __html: APP_MARKUP }} />
      <PrivacyScreen />
    </>
  );
}

export default App;
