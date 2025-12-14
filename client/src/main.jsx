import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registrar Service Worker para funcionalidad PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado:', registration.scope);
        
        // Verificar actualizaciones periódicamente
        setInterval(() => {
          registration.update();
        }, 60000); // Cada minuto
      })
      .catch((error) => {
        console.error('Error al registrar Service Worker:', error);
      });
  });
}
