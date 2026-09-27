import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Guard against unhandled promise rejections bubbling into cross-origin iframe Script error
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const r = event.reason;
    const reason = String(r?.message || r?.reason || r?.name || r || '');
    if (
      reason.toLowerCase().includes('websocket') || 
      reason.toLowerCase().includes('closed without opened') ||
      (r && typeof r === 'object' && ('target' in r || 'code' in r || 'wasClean' in r))
    ) {
      // HMR is disabled in AI Studio preview; ignore websocket errors silently
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return;
    }
    // Only warn for genuine application errors
    console.warn('Captured unhandled promise rejection:', event.reason);
    event.preventDefault();
  }, true);

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    if (msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('closed without opened')) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

