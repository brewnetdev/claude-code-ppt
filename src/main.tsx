import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/editor.css';

// Dev-only: react-grab lets you ⌘C any element on the page to copy its
// source location for pasting into AI coding agents. Vite guarantees
// import.meta.env.DEV is statically false in production builds, so the
// dynamic import is tree-shaken from the prod bundle.
// NOTE: disabled during presentation demos — the on-page icon is distracting.
// Re-enable by uncommenting the block below.
// if (import.meta.env.DEV) {
//   import('react-grab');
// }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
