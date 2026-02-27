import React from 'react';

/**
 * Placeholder root component for the MetaMech Simulation Studio front‑end.
 *
 * This component currently renders a simple welcome message.  Future
 * development will replace this with routing for the login page, projects
 * dashboard and 3D editor.
 */
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>MetaMech Simulation Studio</h1>
      <p>
        This is a placeholder front‑end.  Use this skeleton to build the
        login page, project dashboard and 3D editor as described in the
        specification.
      </p>
    </div>
  );
}