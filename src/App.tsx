import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './routes/Home';
import ScalesPage from './routes/ScalesPage';
import ChordsPage from './routes/ChordsPage';
import SupportModal from './components/SupportModal';
import CookieNotice from './components/CookieNotice';
import './styles/app.css';

const SUPPORT_MODAL_KEY = 'gtr-support-modal-dismissed';
const SUPPORT_DELAY_MS = 5 * 60 * 1000;

export default function App() {
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const alreadyDismissed = window.localStorage.getItem(SUPPORT_MODAL_KEY);
    if (alreadyDismissed) {
      return;
    }
    const timer = window.setTimeout(() => {
      setShowSupportModal(true);
    }, SUPPORT_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const handleCloseSupportModal = () => {
    window.localStorage.setItem(SUPPORT_MODAL_KEY, '1');
    setShowSupportModal(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scales" element={<ScalesPage />} />
        <Route path="/chords" element={<ChordsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SupportModal open={showSupportModal} onClose={handleCloseSupportModal} />
      <CookieNotice />
    </BrowserRouter>
  );
}
