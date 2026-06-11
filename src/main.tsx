import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProviderBoundary } from './auth';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProviderBoundary>{(auth) => <App auth={auth} />}</AuthProviderBoundary>
  </React.StrictMode>
);
