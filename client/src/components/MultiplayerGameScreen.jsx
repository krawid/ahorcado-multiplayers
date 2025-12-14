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

  // Determinar si soy el que establece la palabra en esta ronda
  // Por defecto, el host es el que establece la palabra en la primera ronda
  const currentSetter = gameState.currentSetter || 'host';
  const iAmSetter = (role === 'host' && currentSetter === 'host') ||
                    (role === 'guest' && currentSetter === 'guest');
  const iAmGuesser = !iAmSetter;

  // Scores con valores por defecto
  const scores = gameState.scores || { host: 0, guest: 0 };
  const myScore = scores[role] || 0;
  const rivalScore = scores[role === 'host' ? 'guest' : 'host'] || 0;

  // Resetear wordSet cuando cambia la ronda
  useEffect(() => {
    setWordSet(false);
    setWordInput('');
    setLetterInput('');
  }, [gameState.currentRound || 1]);

  // Enfocar input correspondiente al montar o cuando cambia el rol
  useEffect(() => {
    if (iAmSetter && !wordSet && wordInputRef.current) {
      wordInputRef.current.focus();
    } else if (iAmGuesser && letterInputRef.current && gameState.displayWord) {
      letterInputRef.current.focus();
    }
  }, [iAmSetter, iAmGuesser, wordSet, gameState.displayWord]);

  // Anunciar cuando el juego comienza
  useEffect(() => {
    if (gameState.displayWord && !gameState.gameOver && iAmGuesser) {
      const wordLength = gameState.displayWord.replace(/ /g, '').length;
      announceToScreenReader(`La palabra tiene ${wordLength} letras`, 'polite');
    }
  }, [gameState.displayWord, gameState.gameOver, iAmGuesser]);

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

  // Si hay un ganador definitivo de la partida
  if (gameState.matchOver) {
    const iWon = (role === gameState.matchWinner);
    
    return (
      <main className="multiplayer-game-screen">
        <div className="room-header">
          <h1>Partida Finalizada</h1>
        </div>

        <div className="match-over-info">
          <h2>{iWon ? '¡Felicidades! Ganaste la partida' : 'Perdiste la partida'}</h2>
          
          <div className="scores">
            <h3>Puntuación Final</h3>
            <p>Tú: {myScore} - Rival: {rivalScore}</p>
          </div>

          <div className="round-history">
            <h3>Historial de Rondas</h3>
            {gameState.roundResults && gameState.roundResults.map((result, index) => {
              const wasIGuesser = (role === 'host' && result.guesser === 'host') ||
                                  (role === 'guest' && result.guesser === 'guest');
              return (
                <p key={index}>
                  Ronda {result.round}: {wasIGuesser ? 'Tú adivinaste' : 'Tu rival adivinó'} - {result.won ? '✓ Ganó' : '✗ Perdió'}
                </p>
              );
            })}
          </div>

          <div className="game-over-buttons">
            <button className="btn btn-primary" onClick={onExit}>
              Volver al Inicio
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Vista del que establece la palabra
  if (iAmSetter) {
    if (!wordSet) {
      return (
        <main className="multiplayer-game-screen">
          <div className="room-header">
            <h1>Sala: {roomCode}</h1>
            <p>Ronda {gameState.currentRound || 1} - Tú estableces la palabra</p>
          </div>

          <div className="scores-display">
            <p>Tú: {myScore} - Rival: {rivalScore}</p>
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

    // Observando el juego (establecí la palabra)
    return (
      <main className="multiplayer-game-screen">
        <div className="room-header">
          <h1>Sala: {roomCode}</h1>
          <p>Ronda {gameState.currentRound || 1} - Observando</p>
        </div>

        <div className="scores-display">
          <p>Tú: {myScore} - Rival: {rivalScore}</p>
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
            <h2>{gameState.won ? '¡Tu rival ganó esta ronda!' : 'Tu rival perdió esta ronda'}</h2>
            <p>La palabra era: <strong>{gameState.word}</strong></p>
            
            <div className="game-over-buttons">
              <button className="btn btn-primary" onClick={handleNewGame}>
                Siguiente Ronda
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

  // Vista del que adivina
  return (
    <main className="multiplayer-game-screen">
      <div className="room-header">
        <h1>Sala: {roomCode}</h1>
        <p>Ronda {gameState.currentRound || 1} - Tú adivinas</p>
      </div>

      <div className="scores-display">
        <p>Tú: {myScore} - Rival: {rivalScore}</p>
      </div>

      {!gameState.displayWord ? (
        <div className="waiting-word">
          <div className="spinner"></div>
          <p>Esperando a que tu rival establezca la palabra...</p>
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
              <h2>{gameState.won ? '¡Ganaste esta ronda!' : 'Perdiste esta ronda'}</h2>
              <p>La palabra era: <strong>{gameState.word}</strong></p>
              
              <div className="game-over-buttons">
                <button className="btn btn-primary" onClick={handleNewGame}>
                  Siguiente Ronda
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
