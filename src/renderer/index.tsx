// ─────────────────────────────────────────────────────────
// Renderer Entry Point
// ─────────────────────────────────────────────────────────

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { overlayTheme } from './theme';
import { App } from './components/App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={overlayTheme}>
      <CssBaseline enableColorScheme />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
