export function PrivacyScreen() {
  return (
    <div id="pwa-privacy-screen">
      <img
        src="assets/images/icons/logo.png"
        alt="xFetishHub"
        style={{ width: '80px', height: 'auto', marginBottom: '20px' }}
      />
      <div
        style={{
          fontWeight: 800,
          fontSize: '24px',
          color: 'var(--text-main)',
          textTransform: 'uppercase',
        }}
      >
        xFetishHub
      </div>
      <div
        style={{
          color: 'var(--text-secondary)',
          fontSize: '12px',
          marginTop: '5px',
        }}
      >
        Locked
      </div>
    </div>
  );
}
