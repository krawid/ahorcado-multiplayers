import { useState, useEffect } from 'react';
import { HangmanGame } from './gameLogic.js';
import { loadSettings, saveSettings } from './utils/storageUtils.js';
import { initializeAriaRegions, announceToScreenReader } from './utils/ariaUtils.js';
import { audioSystem } from './utils/audioSystem.js';
import StartScreen from './components/StartScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import GameOverModal from './components/GameOverModal.jsx';
import WordManagementModal from './components/WordManagementModal.jsx';
import './App.css';

/**
 * Componente principal de la aplicación
 * Maneja el estado global y la navegación entre pantallas
 */
function App() {
  const [currentScreen, setCurrentScreen] = useState('start'); // 'start' o 'game'
  const [game, setGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [showWordManagement, setShowWordManagement] = useState(false);
  const [settings, setSettings] = useState({
    category: 'Animales',
    difficulty: 'Normal',
    soundEnabled: true
  });

  // Inicializar al montar
  useEffect(() => {
    // Inicializar regiones ARIA
    initializeAriaRegions();

    // Cargar configuraciones guardadas
    const savedSettings = loadSettings();
    if (savedSettings) {
      setSettings(savedSettings);
      audioSystem.setEnabled(savedSettings.soundEnabled);
    }

    // Inicializar audio después de interacción del usuario
    const initAudio = () => {
      audioSystem.initialize();
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);

    return () => {
      document.removeEventListener('click', initAudio);
    };
  }, []);

  // Guardar configuraciones cuando cambien
  useEffect(() => {
    saveSettings(settings);
    audioSystem.setEnabled(settings.soundEnabled);
  }, [settings]);

  // Handlers de configuración
  const handleChangeCategory = (category) => {
    setSettings(prev => ({ ...prev, category }));
  };

  const handleChangeDifficulty = (difficulty) => {
    setSettings(prev => ({ ...prev, difficulty }));
  };

  // Actualizar estado del juego desde la instancia
  const updateGameState = () => {
    if (!game) return;
    
    setGameState(game.getGameState());
  };

  // Iniciar nuevo juego
  const handleStartGame = () => {
    // Inicializar audio si no está inicializado
    if (!audioSystem.initialized) {
      audioSystem.initialize();
    }

    // Crear nueva instancia del juego con configuración actual
    const newGame = new HangmanGame(settings);
    const result = newGame.startNewGame();
    
    if (result.success) {
      setGame(newGame);
      setGameState(newGame.getGameState());
      setCurrentScreen('game');
    }
  };

  // Adivinar letra
  const handleGuessLetter = async (letter) => {
    if (!game || game.gameOver) return;

    const result = game.guessLetter(letter);
    
    // Reproducir sonido según el resultado
    if (result.success && result.correct) {
      await audioSystem.playCorrectSound();
    } else if (result.success && !result.correct) {
      await audioSystem.playIncorrectSound();
    }

    // Actualizar estado
    updateGameState();

    // Si la letra es correcta, anunciar también cómo queda la palabra
    if (result.success && result.correct && !game.gameOver) {
      const displayWord = game.getDisplayWord();
      const wordForSpeech = displayWord.split(' ').map(char => 
        char === '_' ? 'guión bajo' : char
      ).join(', ');
      
      // Anunciar después de un pequeño delay para que se escuche después del mensaje de "correcto"
      setTimeout(() => {
        announceToScreenReader(`La palabra queda: ${wordForSpeech}`, 'polite');
      }, 800);
    }

    // Si el juego terminó, reproducir sonido correspondiente
    if (game.gameOver) {
      setTimeout(async () => {
        if (game.won) {
          await audioSystem.playWinSound();
        } else {
          await audioSystem.playLoseSound();
        }
      }, 500);
    }
  };

  // Adivinar palabra completa
  const handleGuessWord = async (word) => {
    if (!game || game.gameOver) return;

    const result = game.guessWord(word);
    
    // Reproducir sonido según el resultado
    if (result.success && result.correct) {
      await audioSystem.playCorrectSound();
    } else if (result.success && !result.correct) {
      await audioSystem.playIncorrectSound();
    }

    // Actualizar estado
    updateGameState();

    // Si el juego terminó, reproducir sonido correspondiente
    if (game.gameOver) {
      setTimeout(async () => {
        if (game.won) {
          await audioSystem.playWinSound();
        } else {
          await audioSystem.playLoseSound();
        }
      }, 500);
    }
  };

  // Pedir pista
  const handleHint = async () => {
    if (!game || game.gameOver) return;

    const result = game.getHint();
    
    if (result.success) {
      await audioSystem.playCorrectSound();
      
      // Actualizar estado primero
      updateGameState();
      
      // Anunciar cómo queda la palabra después de la pista
      setTimeout(() => {
        const displayWord = game.getDisplayWord();
        const wordForSpeech = displayWord.split(' ').map(char => 
          char === '_' ? 'guión bajo' : char
        ).join(', ');
        announceToScreenReader(`La palabra queda: ${wordForSpeech}`, 'polite');
      }, 800);
    } else {
      // Actualizar estado
      updateGameState();
    }

    // Si el juego terminó con la pista, reproducir sonido de victoria
    if (game.gameOver && game.won) {
      setTimeout(async () => {
        await audioSystem.playWinSound();
      }, 500);
    }
  };

  // Abandonar partida
  const handleAbandon = () => {
    setCurrentScreen('start');
    setGame(null);
    setGameState(null);
  };

  // Jugar otra vez desde el modal
  const handlePlayAgain = () => {
    handleStartGame();
  };

  // Volver al inicio desde el modal
  const handleGoHome = () => {
    setCurrentScreen('start');
    setGame(null);
    setGameState(null);
  };

  // Gestionar palabras
  const handleManageWords = () => {
    setShowWordManagement(true);
  };

  const handleCloseWordManagement = () => {
    setShowWordManagement(false);
  };

  return (
    <div className="app">
      {currentScreen === 'start' && (
        <StartScreen
          category={settings.category}
          difficulty={settings.difficulty}
          onStartGame={handleStartGame}
          onChangeCategory={handleChangeCategory}
          onChangeDifficulty={handleChangeDifficulty}
          onManageWords={handleManageWords}
        />
      )}

      {currentScreen === 'game' && gameState && (
        <>
          <GameScreen
            gameState={gameState}
            onGuessLetter={handleGuessLetter}
            onGuessWord={handleGuessWord}
            onHint={handleHint}
            onAbandon={handleAbandon}
          />

          {/* Modal de fin de juego */}
          {gameState.gameOver && (
            <GameOverModal
              won={gameState.won}
              word={gameState.word}
              onPlayAgain={handlePlayAgain}
              onGoHome={handleGoHome}
            />
          )}
        </>
      )}

      {/* Modal de gestión de palabras */}
      {showWordManagement && (
        <WordManagementModal onClose={handleCloseWordManagement} />
      )}
    </div>
  );
}

export default App;
