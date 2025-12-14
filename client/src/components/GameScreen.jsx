import { useState, useRef, useEffect, useCallback } from 'react';
import { announceToScreenReader, trapFocusInModal, releaseFocusTrap } from '../utils/ariaUtils.js';
import './GameScreen.css';

/**
 * Componente de pantalla de juego
 * Muestra el estado del juego y permite adivinar letras/palabras
 */
export default function GameScreen({
  gameState,
  onGuessLetter,
  onGuessWord,
  onHint,
  onAbandon
}) {
  const [letterInput, setLetterInput] = useState('');
  const [showWordDialog, setShowWordDialog] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const letterInputRef = useRef(null);
  const hintDialogRef = useRef(null);
  const wordDialogRef = useRef(null);

  // Enfocar el input de letra al montar y anunciar información inicial
  useEffect(() => {
    if (letterInputRef.current) {
      letterInputRef.current.focus();
    }
    
    // Anunciar información de la palabra al iniciar
    const wordLength = gameState.word.length;
    announceToScreenReader(`La palabra tiene ${wordLength} letras`, 'polite');
  }, []);

  // Anunciar cambios en el estado del juego
  useEffect(() => {
    if (gameState.lastMessage) {
      announceToScreenReader(gameState.lastMessage, 'assertive');
    }
  }, [gameState.lastMessage]);

  const handleLetterInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    // Solo permitir una letra
    if (value.length <= 1) {
      setLetterInput(value);
    }
  };

  const handleLetterSubmit = (e) => {
    e.preventDefault();
    
    if (letterInput.trim() === '') {
      announceToScreenReader('Por favor ingresa una letra', 'assertive');
      return;
    }

    onGuessLetter(letterInput);
    setLetterInput('');
    
    // Mantener foco en el input
    if (letterInputRef.current) {
      letterInputRef.current.focus();
    }
  };

  const handleOpenWordDialog = () => {
    setShowWordDialog(true);
    announceToScreenReader('Diálogo para adivinar palabra completa abierto', 'assertive');
  };

  const handleCloseWordDialog = () => {
    setShowWordDialog(false);
    setWordInput('');
    releaseFocusTrap();
    announceToScreenReader('Diálogo cerrado', 'polite');
    
    // Devolver foco al input de letra
    if (letterInputRef.current) {
      letterInputRef.current.focus();
    }
  };

  const handleWordSubmit = (e) => {
    e.preventDefault();
    
    if (wordInput.trim() === '') {
      announceToScreenReader('Por favor ingresa una palabra', 'assertive');
      return;
    }

    onGuessWord(wordInput);
    handleCloseWordDialog();
  };

  const handleOpenHintConfirm = () => {
    if (gameState.attemptsLeft <= 1) {
      announceToScreenReader('No puedes pedir pistas cuando te queda 1 intento o menos', 'assertive');
      return;
    }
    
    setShowHintConfirm(true);
    announceToScreenReader('Confirmación de pista. Usar una pista cuesta 1 intento', 'assertive');
  };

  const handleCloseHintConfirm = () => {
    setShowHintConfirm(false);
    releaseFocusTrap();
    announceToScreenReader('Confirmación cancelada', 'polite');
    
    // Devolver foco al input de letra
    if (letterInputRef.current) {
      letterInputRef.current.focus();
    }
  };

  const handleConfirmHint = async () => {
    setShowHintConfirm(false);
    await onHint();
    
    // Devolver foco al input de letra
    if (letterInputRef.current) {
      letterInputRef.current.focus();
    }
  };

  const handleAbandonConfirm = () => {
    if (window.confirm('¿Estás seguro de que quieres abandonar esta partida?')) {
      onAbandon();
    }
  };

  // Función para anunciar la palabra actual
  const announceCurrentWord = useCallback(() => {
    const displayWord = gameState.displayWord;
    const wordForSpeech = displayWord.split(' ').map(char => 
      char === '_' ? 'guión bajo' : char
    ).join(', ');
    announceToScreenReader(`La palabra es: ${wordForSpeech}`, 'polite');
  }, [gameState.displayWord]);

  // Capturar foco cuando se abre el diálogo de palabra
  useEffect(() => {
    if (showWordDialog && wordDialogRef.current) {
      trapFocusInModal(wordDialogRef.current);
    }
  }, [showWordDialog]);

  // Capturar foco cuando se abre el diálogo de pista
  useEffect(() => {
    if (showHintConfirm && hintDialogRef.current) {
      trapFocusInModal(hintDialogRef.current);
    }
  }, [showHintConfirm]);

  // Manejar tecla Escape para cerrar diálogos y Ctrl+L para anunciar palabra
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showWordDialog) {
          handleCloseWordDialog();
        }
        if (showHintConfirm) {
          handleCloseHintConfirm();
        }
      }
      
      // Ctrl+L para anunciar la palabra
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        announceCurrentWord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWordDialog, showHintConfirm, announceCurrentWord]);

  return (
    <main className="game-screen">
      {/* Información del juego */}
      <ul className="game-info">
        <li className="info-item">
          Categoría: {gameState.category}
        </li>
        <li className="info-item">
          Dificultad: {gameState.difficulty}
        </li>
        <li className={`info-item ${gameState.attemptsLeft <= 2 ? 'danger' : ''}`}>
          Intentos: {gameState.attemptsLeft} / {gameState.maxAttempts}
        </li>
      </ul>

      {/* Palabra a adivinar */}
      <div className="word-display">
        <p className="word-info">La palabra tiene {gameState.word.length} letras</p>
        <div 
          className="word-letters"
          role="img"
          aria-label={`Palabra: ${gameState.displayWord.split(' ').join(', ')}`}
        >
          {gameState.displayWord.split(' ').map((letter, index) => (
            <span key={index} className="word-letter" aria-hidden="true">
              {letter}
            </span>
          ))}
        </div>
      </div>

      {/* Letras usadas */}
      <div className="used-letters">
        <h2>Letras usadas</h2>
        <div 
          className="letters-list"
          role="img"
          aria-label={gameState.guessedLetters.length > 0 
            ? `Letras usadas: ${gameState.guessedLetters.join(', ')}`
            : 'No has usado ninguna letra todavía'}
        >
          {gameState.guessedLetters.length > 0 ? (
            gameState.guessedLetters.map((letter, index) => (
              <span key={index} className="used-letter" aria-hidden="true">
                {letter}
              </span>
            ))
          ) : (
            <span className="no-letters" aria-hidden="true">Ninguna</span>
          )}
        </div>
      </div>

      {/* Controles del juego */}
      <div className="game-controls">
        {/* Input de letra */}
        <form onSubmit={handleLetterSubmit} className="letter-form">
          <label htmlFor="letter-input" className="sr-only">
            Ingresa una letra
          </label>
          <input
            ref={letterInputRef}
            id="letter-input"
            type="text"
            className="letter-input"
            value={letterInput}
            onChange={handleLetterInputChange}
            placeholder="Letra"
            maxLength="1"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary">
            Adivinar Letra
          </button>
        </form>

        {/* Botones de acción */}
        <div className="action-buttons">
          <button
            className="btn btn-secondary"
            onClick={handleOpenWordDialog}
          >
            Adivinar Palabra
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleOpenHintConfirm}
            disabled={gameState.attemptsLeft <= 1}
            title={gameState.attemptsLeft <= 1 ? 'No disponible con 1 intento o menos' : 'Cuesta 1 intento'}
          >
            Pista
          </button>

          <button
            className="btn btn-danger"
            onClick={handleAbandonConfirm}
          >
            Abandonar
          </button>
        </div>
      </div>

      {/* Diálogo para adivinar palabra */}
      {showWordDialog && (
        <div 
          className="dialog-overlay" 
          onClick={handleCloseWordDialog}
        >
          <div 
            ref={wordDialogRef}
            className="dialog" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="word-dialog-title"
            aria-modal="true"
          >
            <h2 id="word-dialog-title">Adivinar Palabra Completa</h2>
            
            <form onSubmit={handleWordSubmit} className="word-form">
              <label htmlFor="word-input">
                Ingresa la palabra completa:
              </label>
              <input
                id="word-input"
                type="text"
                className="word-input"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value.toUpperCase())}
                placeholder="PALABRA"
                autoFocus
                autoComplete="off"
              />
              
              <div className="dialog-buttons">
                <button type="submit" className="btn btn-primary">
                  Confirmar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseWordDialog}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación de pista */}
      {showHintConfirm && (
        <div 
          className="dialog-overlay" 
          onClick={handleCloseHintConfirm}
        >
          <div 
            ref={hintDialogRef}
            className="dialog dialog-small" 
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="hint-dialog-title"
            aria-describedby="hint-dialog-desc"
            aria-modal="true"
          >
            <h2 id="hint-dialog-title">Confirmar Pista</h2>
            <p id="hint-dialog-desc">
              Usar una pista te costará 1 intento. Te quedarán {gameState.attemptsLeft - 1} intentos.
            </p>
            
            <div className="dialog-buttons">
              <button 
                className="btn btn-primary"
                onClick={handleConfirmHint}
                autoFocus
              >
                Usar Pista
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCloseHintConfirm}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
