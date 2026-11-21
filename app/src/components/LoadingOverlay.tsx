import { useEffect, useState } from 'react';
import { SYNC_KEYS } from '../services/storage';

const BG_COLORS: Record<string, string> = {
  dark: '#12000b',
  light: '#ffeef8',
  'blue-dark': '#020c1b',
  'blue-light': '#dbeafe',
  'green-dark': '#020a02',
  'green-light': '#dcfce7',
  'red-dark': '#0d0000',
  'red-light': '#ffe4e6',
  'gold-dark': '#0a0900',
  'gold-light': '#fef3c7',
  noir: '#000000',
  'old-money': '#1a0505',
};

const ACCENT_COLORS: Record<string, string> = {
  dark: '#ff00cc',
  light: '#db2777',
  'blue-dark': '#64ffda',
  'blue-light': '#2563eb',
  'green-dark': '#2ecc71',
  'green-light': '#16a34a',
  'red-dark': '#e74c3c',
  'red-light': '#e11d48',
  'gold-dark': '#f1c40f',
  'gold-light': '#d97706',
  noir: '#ffffff',
  'old-money': '#c5a059',
};

const PHRASES = [
  'Warming up engines...',
  'Decrypting desires...',
  'Loading pleasure...',
  'Scanning for kinks...',
  'Preparing visuals...',
  'Calibrating algorithms...',
  'Checking compatibility...',
  'Connecting to the hub...',
  'Fetching spicy data...',
  'Analyzing preferences...',
  'Unlocking categories...',
  'Setting the mood...',
  'Almost there...',
  'Optimizing experience...',
];

export function LoadingOverlay() {
  const themeId = localStorage.getItem(SYNC_KEYS.THEME_ID) || 'dark';
  const isLight = themeId.includes('light');

  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * PHRASES.length)
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const phraseInterval = window.setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    }, 800);

    const progressInterval = window.setInterval(() => {
      setProgress((prev) => {
        let increment = 0;
        if (prev < 30) increment = Math.random() * 5;
        else if (prev < 70) increment = Math.random() * 2;
        else if (prev < 90) increment = Math.random() * 0.5;
        return Math.min(90, prev + increment);
      });
    }, 100);

    (window as unknown as Record<string, unknown>).loaderIntervals = {
      phrase: phraseInterval,
      progress: progressInterval,
    };

    return () => {
      clearInterval(phraseInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div
      id="loading-overlay"
      style={{ backgroundColor: BG_COLORS[themeId] || undefined }}
    >
      <img
        src="assets/images/icons/icon_light.png"
        className="loader-logo"
        alt="Loading..."
        style={isLight ? { filter: 'invert(1)' } : undefined}
      />
      <div
        className="loader-text"
        id="loader-phrase"
        style={isLight ? { color: '#555' } : undefined}
      >
        {PHRASES[phraseIndex]}
      </div>

      <div
        className="loader-progress-container"
        style={isLight ? { background: 'rgba(0,0,0,0.1)' } : undefined}
      >
        <div
          className="loader-progress-fill"
          id="loader-bar"
          style={{
            width: `${progress}%`,
            background: ACCENT_COLORS[themeId] || undefined,
          }}
        />
      </div>
    </div>
  );
}
