import { useEffect } from 'react';
import { announceToScreenReader } from '../utils/ariaUtils.js';
import './MultiplayerWaitingRoom.css';

/**
 * Sala de espera para el host
 * Muestra el código de sala y espera a que se una el invitado
 */
export default function MultiplayerWaitingRoom({ roomCode, onCancel }) {
  useEffect(() => {
    announceToScreenReader(`Sala creada. Código: ${roomCode.split('').join(' ')}`, 'polite');
  }, [roomCode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    announceToScreenReader('Código copiado al portapapeles', 'polite');
  };

  return (
    <main className="waiting-room">
      <h1>Sala Creada</h1>

      <div className="room-info">
        <p>Comparte este código con tu amigo:</p>
        
        <div className="room-code-display">
          <span className="room-code">{roomCode}</span>
          <button
            className="btn btn-secondary"
            onClick={copyToClipboard}
            aria-label="Copiar código"
          >
            📋 Copiar
          </button>
        </div>

        <div className="waiting-indicator">
          <div className="spinner"></div>
          <p>Esperando a que se una tu amigo...</p>
        </div>
      </div>

      <button className="btn btn-danger" onClick={onCancel}>
        Cancelar
      </button>
    </main>
  );
}
