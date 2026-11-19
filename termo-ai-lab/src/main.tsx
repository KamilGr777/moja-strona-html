import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initConnectivity } from './lib/connectivity';
import { initInstall } from './lib/install';
import './index.css';

initConnectivity();
initInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
