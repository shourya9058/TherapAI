import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Create a root.
const root = createRoot(document.getElementById('root'));

// Initial render: Render the App component to the root.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
