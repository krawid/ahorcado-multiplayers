import { useState } from 'react';
import { announceToScreenReader } from '../utils/ariaUtils.js';
import './MultiplayerLobby.css';

/**
 * Componente de lobby multijugador
 * Permite crear o unirse a una sala
 */
export default function MultiplayerLobby({ onCreateRoom, onJoinRoom, onBack }) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    announceToScreenReader('Creando sala...', 'polite');
    onCreateRoom();
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      setError('Ingresa un código de sala');
      announceToScreenReader('Ingresa un código de sala', 'assertive');
      return;
    }

    if (roomCode.length !== 6) {
      setError('El código debe tener 6 caracteres');
      announceToScreenReader('El código debe tener 6 caracteres', 'assertive');
      return;
    }

    setError('');
    announceToScreenReader('Uniéndose a sala...', 'polite');
    onJoinRoom(roomCode.toUpperCase());
  };

  return (
    <main className="multiplayer-lobby">
      <h1>Modo Multijugador</h1>

      <div className="lobby-content">
        <div className="lobby-section">
          <h2>Crear Sala</h2>
          <p>Crea una sala y comparte el código con tu amigo</p>
          <button
            className="btn btn-primary btn-large"
            onClick={handleCreateRoom}
          >
            Crear Sala
          </button>
        </div>

        <div className="lobby-divider">
          <span>O</span>
        </div>

        <div className="lobby-section">
          <h2>Unirse a Sala</h2>
          <p>Ingresa el código que te compartió tu amigo</p>
          
          <form onSubmit={handleJoinRoom} className="join-form">
            <label htmlFor="room-code">Código de sala:</label>
            <input
              id="room-code"
              type="text"
              className="room-code-input"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength="6"
              autoComplete="off"
            />
            
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-large">
              Unirse
            </button>
          </form>
        </div>
      </div>

      <button className="btn btn-secondary" onClick={onBack}>
        Volver
      </button>
    </main>
  );
}
