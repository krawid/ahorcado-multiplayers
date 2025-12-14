import { useEffect, useRef } from 'react';
import { announceToScreenReader, trapFocusInModal, releaseFocusTrap } from '../utils/ariaUtils.js';
import './GameOverModal.css';

/**
 * Modal que se muestra cuando el juego termina
 * Muestra resultado (victoria/derrota) y opciones para continuar
 */
export default function GameOverModal({ won, word, onPlayAgain, onGoHome }) {
  const modalRef = useRef(null);

  // Anunciar resultado y capturar foco al montar
  useEffect(() => {
    const message = won 
      ? `¡Felicidades! Has ganado. La palabra era ${word}`
      : `Has perdido. La palabra era ${word}`;
    
    announceToScreenReader(message, 'assertive');

    // Capturar foco en el modal
    if (modalRef.current) {
      trapFocusInModal(modalRef.current);
    }

    // Liberar foco al desmontar
    return () => {
      releaseFocusTrap();
    };
  }, [won, word]);

  const handlePlayAgain = () => {
    releaseFocusTrap();
    onPlayAgain();
  };

  const handleGoHome = () => {
    releaseFocusTrap();
    onGoHome();
  };

  return (
    <div className="modal-overlay">
      <div 
        ref={modalRef}
        className={`game-over-modal ${won ? 'victory' : 'defeat'}`}
        role="alertdialog"
        aria-labelledby="game-over-title"
        aria-describedby="game-over-message"
        aria-modal="true"
      >
        {/* Icono/Emoji */}
        <div className="modal-icon" aria-hidden="true">
          {won ? '🎉' : '😔'}
        </div>

        {/* Título */}
        <h1 id="game-over-title" className="modal-title">
          {won ? '¡Felicidades!' : 'Juego Terminado'}
        </h1>

        {/* Mensaje */}
        <p id="game-over-message" className="modal-message">
          {won ? '¡Has ganado!' : 'Has perdido'}
        </p>

        {/* Palabra */}
        <div className="modal-word">
          <span className="word-label">La palabra era:</span>
          <span className="word-value">{word}</span>
        </div>

        {/* Botones */}
        <div className="modal-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handlePlayAgain}
            autoFocus
          >
            Jugar Otra Vez
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleGoHome}
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
