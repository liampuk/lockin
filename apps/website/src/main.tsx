import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Inject font with correct base URL before CSS loads (so subpath deployment works)
const base = import.meta.env.BASE_URL;
const fontUrl = `${base}VT323-Regular.ttf`;
const fontStyle = document.createElement('style');
fontStyle.textContent = `@font-face{font-family:"VT323";src:url("${fontUrl}") format("truetype");font-weight:400;font-style:normal;}`;
document.documentElement.prepend(fontStyle);
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
