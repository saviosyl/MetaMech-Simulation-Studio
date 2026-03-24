import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { refreshRuntimePublishedAssets } from './lib/runtimePublishedAssets.ts'

// Best-effort bootstrap: merge published library assets into runtime manifest.
void refreshRuntimePublishedAssets().catch(() => undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
