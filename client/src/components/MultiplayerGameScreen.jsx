import { useState, useRef, useEffect } from 'react';
import { announceToScreenReader } from '../utils/ariaUtils.js';
import './MultiplayerGameScreen.css';

/**
 * Componente de pantalla de juego multijugador
 * Host: establece palabra y observa
 * Guest: adivina la palabra
 */
export default function MultiplayerGameScreen({
  gameState,
  role,
  roomCode,
  onSetWord,
  onGuess,
  onNewGame,
  onExit
}) {
  const [wordInput, setWordInput] = useState('');
  const [letterInput, setLetterInput] = useState('');
  const [wordSet, setWordSet] = useState(false);
  const letterInputRef = useRef(null);
  const wordInputRef = useRef(null);

  // Enfocar input correspondiente al montar
  useEffect(() => {
    if (role === 'host' && !wordSet && wordInputRef.current) {
      wordInputRef.current.focus();
    } else if (role === 'guest' && letterInputRef.current) {
      letterInputRef.current.focus();
    }
  }, [role, wordSet]);

  // Anunciar cuando el juego comienza
  useEffect(() => {
    if (gameState.displayWord && !gameState.gameOver) {
      if (role === 'guest') {
        const wordLength = gameState.displayWord.replace(/ /g, '').length;
        announceToScreenReader(`La palabra tiene ${wordLength} letras`, 'polite');
      }
    }
  }, [gameState.displayWord, role]);

  const handleSetWord = (e) => {
    e.preventDefault();
    
    if (!wordInput.trim()) {
      announceToScreenReader('Ingresa una palabra', 'assertive');
      return;
    }

    if (wordInput.length < 3) {
      announceToScreenReader('La palabra debe tener al menos 3 letras', 'assertive');
      return;
    }

    onSetWord(wordInput);
    setWordSet(true);
    announceToScreenReader('Palabra establecida. Esperando a que tu amigo adivine', 'polite');
  };

  const handleLetterSubmit = (e) => {
    e.preventDefault();
    
    if (letterInput.trim() === '') {
      announceToScreenReader('Por favor ingresa una letra', 'assertive');
      return;
    }

    if (gameState.guessedLetters.includes(letterInput)) {
      announceToScreenReader('Ya usaste esa letra', 'assertive');
      setLetterInput('');
      return;
    }

    onGuess(letterInput);
    setLetterInput('');
    
    if (letterInputRef.current) {
      letterInputRef.current.focus();
    }
  };

  const handleLetterInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    if (value.length <= 1) {
      setLetterInput(value);
    }
  };

  const handleNewGame = () => {
    setWordSet(false);
    setWordInput('');
    onNewGame();
  };

  const handleExit = () => {
    if (window.confirm('¿Salir del juego multijugador?')) {
      onExit();
    }
  };

  // Vista del host: establecer palabra o espectador
  if (role === 'host') {
    if (!wordSet) {
      return (
        <main className="multiplayer-game-screen">
          <div className="room-header">
            <h1>Sala: {roomCode}</h1>
            <p>Eres el anfitrión</p>
          </div>

          <div className="set-word-container">
            <h2>Establece la Palabra</h2>
            <p>Tu amigo intentará adivinarla</p>

            <form onSubmit={handleSetWord} className="set-word-form">
              <label htmlFor="word-input">Palabra secreta:</label>
              <input
                ref={wordInputRef}
                id="word-input"
                type="text"
                className="word-input"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value.toUpperCase())}
                placeholder="PALABRA"
                autoComplete="off"
              />
              
              <button type="submit" className="btn btn-primary btn-large">
                Confirmar Palabra
              </button>
            </form>
          </div>

          <button className="btn btn-danger" onClick={handleExit}>
            Salir
          </button>
        </main>
      );
    }

    // Host observando el juego
    return (
      <main className="multiplayer-game-screen">
        <div className="room-header">
          <h1>Sala: {roomCode}</h1>
          <p>Eres el anfitrión - Observando</p>
        </div>

        <div className="game-info">
          <p>Palabra: <strong>{gameState.word || wordInput}</strong></p>
          <p className={gameState.attemptsLeft <= 2 ? 'danger' : ''}>
            Intentos restantes: {gameState.attemptsLeft} / {gameState.maxAttempts}
          </p>
        </div>

        <div className="word-display">
          <div className="word-letters">
            {gameState.displayWord && gameState.displayWord.split(' ').map((letter, index) => (
              <span key={index} className="word-letter">
                {letter}
              </span>
            ))}
          </div>
        </div>

        <div className="used-letters">
          <h2>Letras usadas</h2>
          <div className="letters-list">
            {gameState.guessedLetters.length > 0 ? (
              gameState.guessedLetters.map((letter, index) => (
                <span key={index} className="used-letter">
                  {letter}
                </span>
              ))
            ) : (
              <span className="no-letters">Ninguna</span>
            )}
          </div>
        </div>

        {gameState.gameOver && (
          <div className="game-over-info">
            <h2>{gameState.won ? '¡Tu amigo ganó!' : 'Tu amigo perdió'}</h2>
            <p>La palabra era: <strong>{gameState.word}</strong></p>
            
            <div className="game-over-buttons">
              <button className="btn btn-primary" onClick={handleNewGame}>
                Nueva Partida
              </button>
              <button className="btn btn-secondary" onClick={handleExit}>
                Salir
              </button>
            </div>
          </div>
        )}

        {!gameState.gameOver && (
          <button className="btn btn-danger" onClick={handleExit}>
            Salir
          </button>
        )}
      </main>
    );
  }

  // Vista del invitado: adivinar
  return (
    <main className="multiplayer-game-screen">
      <div className="room-header">
        <h1>Sala: {roomCode}</h1>
        <p>Eres el invitado - Adivinando</p>
      </div>

      {!gameState.displayWord ? (
        <div className="waiting-word">
          <div className="spinner"></div>
          <p>Esperando a que el anfitrión establezca la palabra...</p>
        </div>
      ) : (
        <>
          <div className="game-info">
            <p className={gameState.attemptsLeft <= 2 ? 'danger' : ''}>
              Intentos: {gameState.attemptsLeft} / {gameState.maxAttempts}
            </p>
          </div>

          <div className="word-display">
            <p className="word-info">
              La palabra tiene {gameState.displayWord.replace(/ /g, '').length} letras
            </p>
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

          {!gameState.gameOver && (
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
                Adivinar
              </button>
            </form>
          )}

          {gameState.gameOver && (
            <div className="game-over-info">
              <h2>{gameState.won ? '¡Felicidades! Ganaste' : 'Perdiste'}</h2>
              <p>La palabra era: <strong>{gameState.word}</strong></p>
              
              <div className="game-over-buttons">
                <button className="btn btn-primary" onClick={handleNewGame}>
                  Jugar de Nuevo
                </button>
                <button className="btn btn-secondary" onClick={handleExit}>
                  Salir
                </button>
              </div>
            </div>
          )}

          {!gameState.gameOver && (
            <button className="btn btn-danger" onClick={handleExit}>
              Salir
            </button>
          )}
        </>
      )}
    </main>
  );
}
