import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gtr-cookie-ack';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  const handleAccept = () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="cookie-notice" role="status">
      <p>
        We only use local storage for essential preferences (no tracking cookies). By continuing you agree to this limited
        use.
      </p>
      <button type="button" onClick={handleAccept}>
        Got it
      </button>
    </div>
  );
}
