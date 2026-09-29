import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter/index.css';
import '../styles.css';
import '../vivid-theme.css';
import { FixtureApp } from './FixtureApp';

const container = document.getElementById('fixture-root') || document.getElementById('root');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <FixtureApp />
    </React.StrictMode>
  );
} else {
  console.error('[FIXTURE ERROR] Root element (#fixture-root or #root) not found.');
}
