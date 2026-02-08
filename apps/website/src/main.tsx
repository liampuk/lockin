import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Set base URL for CSS (e.g. font) when deployed to a subpath
const base = import.meta.env.BASE_URL;
document.documentElement.style.setProperty('--base-url', base);
document.documentElement.style.setProperty('--font-url', `${base}VT323-Regular.ttf`);
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
