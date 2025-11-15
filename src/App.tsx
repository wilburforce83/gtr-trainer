import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './routes/Home';
import ScalesPage from './routes/ScalesPage';
import ChordsPage from './routes/ChordsPage';
import CookieNotice from './components/CookieNotice';
import './styles/app.css';

const MIN_VIEWPORT_WIDTH = 1024;
const MIN_VIEWPORT_HEIGHT = 640;

export default function App() {
  const viewport = useViewportSupport();
  if (!viewport.supported) {
    return (
      <>
        <UnsupportedViewport
          minWidth={MIN_VIEWPORT_WIDTH}
          minHeight={MIN_VIEWPORT_HEIGHT}
          width={viewport.width}
          height={viewport.height}
        />
        <CookieNotice />
      </>
    );
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scales" element={<ScalesPage />} />
        <Route path="/chords" element={<ChordsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieNotice />
    </BrowserRouter>
  );
}

type ViewportState = {
  supported: boolean;
  width: number;
  height: number;
};

function evaluateViewport(width: number, height: number): ViewportState {
  return {
    supported: width >= MIN_VIEWPORT_WIDTH && height >= MIN_VIEWPORT_HEIGHT,
    width,
    height,
  };
}

function useViewportSupport(): ViewportState {
  const [state, setState] = useState<ViewportState>(() => {
    if (typeof window === 'undefined') {
      return { supported: true, width: MIN_VIEWPORT_WIDTH, height: MIN_VIEWPORT_HEIGHT };
    }
    return evaluateViewport(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleResize = () => {
      setState(evaluateViewport(window.innerWidth, window.innerHeight));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

function UnsupportedViewport({
  minWidth,
  minHeight,
  width,
  height,
}: {
  minWidth: number;
  minHeight: number;
  width: number;
  height: number;
}) {
  const orientation = width > height ? 'landscape' : 'portrait';
  const meetsWidth = width >= minWidth;
  const meetsHeight = height >= minHeight;
  return (
    <div className="screen-gate">
      <div className="screen-gate__shell">
        <header className="screen-gate__header">
          <p className="screen-gate__eyebrow">Guitar Theory Lab</p>
          <h1>Best experienced on a larger screen.</h1>
          <p>
            The fretboard, tab, and backing track controls need a landscape layout. Switch to a laptop/desktop or rotate
            your tablet horizontally to unlock the full trainer.
          </p>
        </header>
        <div className="screen-gate__hero">
          <div className="screen-gate__hero-copy">
            <ul>
              <li>
                <span className="screen-gate__hero-label">Minimum width</span>
                <strong>{minWidth}px</strong>
                {!meetsWidth && <small className="screen-gate__badge">expand</small>}
              </li>
              <li>
                <span className="screen-gate__hero-label">Minimum height</span>
                <strong>{minHeight}px</strong>
                {!meetsHeight && <small className="screen-gate__badge">expand</small>}
              </li>
              <li>
                <span className="screen-gate__hero-label">Current viewport</span>
                <strong>
                  {Math.round(width)} × {Math.round(height)}
                </strong>
                <small>{orientation}</small>
              </li>
            </ul>
            <p className="screen-gate__hint">
              Tip: most modern tablets meet the requirement in landscape. On phones, visit again from a computer for the
              best experience.
            </p>
          </div>
          <div className="screen-gate__hero-visual" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
