import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Import your global CSS (tech UI)
import './style.css';

// Import App component
import App from './App.jsx';

// Mount React app to Vite root div
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
