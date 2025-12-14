import { useEffect } from 'react';
import { announceToScreenReader } from '../utils/ariaUtils.js';
import './MultiplayerWaitingRoom.css';

/**
 * Sala de espera
 * Host: Muestra el código de sala y espera a que se una el invitado
 * Guest: Espera a que el host establezca la palabra
 */
export default function MultiplayerWaitingRoom({ roomCode, role, onCancel }) {
  useEffect(() => {
    if (role === 'host') {
      announceToScreenReader(`Sala creada. Código: ${roomCode.split('').join(' ')}`, 'polite');
    } else {
      announceToScreenReader('Te has unido a la sala. Esperando a que el anfitrión establezca la palabra', 'polite');
    }
  }, [roomCode, role]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    announceToScreenReader('Código copiado al portapapeles', 'polite');
  };

  // Vista del host
  if (role === 'host') {
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

  // Vista del invitado
  return (
    <main className="waiting-room">
      <h1>Sala: {roomCode}</h1>

      <div className="room-info">
        <div className="waiting-indicator">
          <div className="spinner"></div>
          <p>Esperando a que el anfitrión establezca la palabra...</p>
        </div>
      </div>

      <button className="btn btn-danger" onClick={onCancel}>
        Salir
      </button>
    </main>
  );
}
