import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// The entry point for the Vite React application.  It creates a root
// container and renders the `App` component into it.
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);