// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Evita que la rueda del mouse modifique un campo numérico enfocado sin querer
document.addEventListener('wheel', () => {
  const activo = document.activeElement;
  if (activo instanceof HTMLInputElement && activo.type === 'number') activo.blur();
}, { passive: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);