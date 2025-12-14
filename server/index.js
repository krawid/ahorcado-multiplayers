import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configurar Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Servir archivos estáticos del frontend
const clientPath = join(__dirname, '../client/dist');
app.use(express.static(clientPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Almacenamiento de salas en memoria
const rooms = new Map();

// Generar código de sala aleatorio
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Clase para gestionar una sala de juego
class GameRoom {
  constructor(roomCode, hostId, settings) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.guestId = null;
    this.settings = settings;
    this.gameState = {
      word: '',
      guessedLetters: [],
      attemptsLeft: settings.maxAttempts || 6,
      maxAttempts: settings.maxAttempts || 6,
      gameOver: false,
      won: false
    };
    // Sistema de turnos y puntuación
    this.currentRound = 1;
    this.currentSetter = 'host'; // 'host' o 'guest' - quien pone la palabra
    this.scores = {
      host: 0,
      guest: 0
    };
    this.roundResults = []; // Historial de resultados por ronda
    this.createdAt = Date.now();
  }

  addGuest(guestId) {
    this.guestId = guestId;
  }

  isReady() {
    return this.hostId && this.guestId;
  }

  startGame(word) {
    this.gameState.word = word.toUpperCase();
    this.gameState.guessedLetters = [];
    this.gameState.attemptsLeft = this.settings.maxAttempts || 6;
    this.gameState.maxAttempts = this.settings.maxAttempts || 6;
    this.gameState.gameOver = false;
    this.gameState.won = false;
  }

  guessLetter(letter) {
    letter = letter.toUpperCase();
    
    if (this.gameState.guessedLetters.includes(letter)) {
      return { success: false, message: 'Letra ya usada' };
    }

    this.gameState.guessedLetters.push(letter);
    const correct = this.gameState.word.includes(letter);
    
    if (!correct) {
      this.gameState.attemptsLeft--;
    }

    // Verificar si ganó
    const allLettersGuessed = this.gameState.word
      .split('')
      .every(l => this.gameState.guessedLetters.includes(l));

    if (allLettersGuessed) {
      this.gameState.gameOver = true;
      this.gameState.won = true;
    } else if (this.gameState.attemptsLeft === 0) {
      this.gameState.gameOver = true;
      this.gameState.won = false;
    }

    return { success: true, correct };
  }

  getDisplayWord() {
    return this.gameState.word
      .split('')
      .map(letter => this.gameState.guessedLetters.includes(letter) ? letter : '_')
      .join(' ');
  }

  switchRoles() {
    this.currentSetter = this.currentSetter === 'host' ? 'guest' : 'host';
    this.currentRound++;
  }

  checkWinner() {
    // Necesitamos al menos 2 resultados (una ronda completa = ambos jugadores jugaron)
    if (this.roundResults.length < 2) {
      return null;
    }

    // Verificar que los dos últimos resultados sean de la misma ronda completa
    // Una ronda completa significa que ambos jugadores han tenido su turno
    const lastTwo = this.roundResults.slice(-2);
    
    // Verificar que sean turnos complementarios (uno como host setter, otro como guest setter)
    const hasHostSetter = lastTwo.some(r => r.setter === 'host');
    const hasGuestSetter = lastTwo.some(r => r.setter === 'guest');
    
    // Si no tenemos ambos roles, la ronda no está completa
    if (!hasHostSetter || !hasGuestSetter) {
      return null;
    }

    // Identificar los resultados por jugador
    const hostResult = lastTwo.find(r => r.guesser === 'host');
    const guestResult = lastTwo.find(r => r.guesser === 'guest');

    // Si uno ganó y otro perdió
    if (hostResult.won && !guestResult.won) {
      return 'host';
    }
    if (!hostResult.won && guestResult.won) {
      return 'guest';
    }

    // Si ambos ganaron, gana quien usó menos intentos
    if (hostResult.won && guestResult.won) {
      if (hostResult.attemptsUsed < guestResult.attemptsUsed) {
        return 'host';
      } else if (guestResult.attemptsUsed < hostResult.attemptsUsed) {
        return 'guest';
      }
      // Si usaron los mismos intentos, continuar jugando
      return null;
    }

    // Si ambos perdieron, continuar jugando
    return null;
  }

  getPublicState() {
    return {
      roomCode: this.roomCode,
      displayWord: this.getDisplayWord(),
      guessedLetters: this.gameState.guessedLetters,
      attemptsLeft: this.gameState.attemptsLeft,
      maxAttempts: this.gameState.maxAttempts,
      gameOver: this.gameState.gameOver,
      won: this.gameState.won,
      word: this.gameState.gameOver ? this.gameState.word : null,
      playersReady: this.isReady(),
      currentRound: this.currentRound,
      currentSetter: this.currentSetter,
      scores: this.scores,
      roundResults: this.roundResults
    };
  }
}

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Ahorcado Multiplayer Server',
    activeRooms: rooms.size 
  });
});

// Conexión de Socket.io
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Crear sala
  socket.on('create-room', (settings, callback) => {
    const roomCode = generateRoomCode();
    const room = new GameRoom(roomCode, socket.id, settings);
    rooms.set(roomCode, room);
    
    socket.join(roomCode);
    
    console.log(`Sala creada: ${roomCode}`);
    
    callback({ 
      success: true, 
      roomCode,
      role: 'host'
    });
  });

  // Unirse a sala
  socket.on('join-room', (roomCode, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      callback({ success: false, message: 'Sala no encontrada' });
      return;
    }

    if (room.guestId) {
      callback({ success: false, message: 'Sala llena' });
      return;
    }

    room.addGuest(socket.id);
    socket.join(roomCode);
    
    console.log(`${socket.id} se unió a sala ${roomCode}`);
    
    const publicState = room.getPublicState();
    
    // Notificar al host que el invitado se unió
    io.to(room.hostId).emit('player-joined', publicState);
    
    callback({ 
      success: true, 
      roomCode,
      role: 'guest'
    });
  });

  // Establecer la palabra (puede ser host o guest según la ronda)
  socket.on('set-word', (roomCode, word) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      return;
    }

    // Verificar que quien envía es el setter actual
    const isCurrentSetter = (room.currentSetter === 'host' && socket.id === room.hostId) ||
                            (room.currentSetter === 'guest' && socket.id === room.guestId);
    
    if (!isCurrentSetter) {
      console.log(`${socket.id} intentó establecer palabra pero no es el setter actual`);
      return;
    }

    room.startGame(word);
    
    console.log(`Palabra establecida en sala ${roomCode} por ${room.currentSetter}`);
    
    io.to(roomCode).emit('game-started', room.getPublicState());
  });

  // Adivinar letra (puede ser host o guest según la ronda)
  socket.on('guess-letter', (roomCode, letter) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      return;
    }

    // Verificar que quien envía es el guesser actual (el que NO es el setter)
    const isCurrentGuesser = (room.currentSetter === 'host' && socket.id === room.guestId) ||
                             (room.currentSetter === 'guest' && socket.id === room.hostId);
    
    if (!isCurrentGuesser) {
      return;
    }

    const result = room.guessLetter(letter);
    
    io.to(roomCode).emit('guess-result', {
      letter,
      correct: result.correct,
      gameState: room.getPublicState()
    });

    // Si el turno terminó, guardar resultado
    if (room.gameState.gameOver) {
      // Guardar resultado del turno
      const guesser = room.currentSetter === 'host' ? 'guest' : 'host';
      const attemptsUsed = room.gameState.maxAttempts - room.gameState.attemptsLeft;
      
      room.roundResults.push({
        round: room.currentRound,
        setter: room.currentSetter,
        guesser: guesser,
        won: room.gameState.won,
        attemptsUsed: attemptsUsed
      });

      // Actualizar puntuación
      if (room.gameState.won) {
        room.scores[guesser]++;
      }

      // Verificar si la ronda completa ha terminado (ambos jugadores han jugado)
      // Una ronda completa = 2 turnos (uno con host como setter, otro con guest como setter)
      const hasHostSetter = room.roundResults.filter(r => r.round === room.currentRound && r.setter === 'host').length > 0;
      const hasGuestSetter = room.roundResults.filter(r => r.round === room.currentRound && r.setter === 'guest').length > 0;
      const roundComplete = hasHostSetter && hasGuestSetter;

      if (roundComplete) {
        // La ronda completa ha terminado, verificar si hay un ganador definitivo
        const winner = room.checkWinner();
        
        if (winner) {
          // Hay un ganador definitivo - emitir inmediatamente
          setTimeout(() => {
            io.to(roomCode).emit('match-winner', {
              winner: winner,
              scores: room.scores,
              roundResults: room.roundResults
            });
          }, 2000); // Esperar 2 segundos para que se escuchen los sonidos de turno
        } else {
          // No hay ganador aún - iniciar nueva ronda (cambiar roles)
          setTimeout(() => {
            room.switchRoles();

            // Resetear estado del juego
            room.gameState = {
              word: '',
              guessedLetters: [],
              attemptsLeft: room.settings.maxAttempts || 6,
              maxAttempts: room.settings.maxAttempts || 6,
              gameOver: false,
              won: false
            };

            io.to(roomCode).emit('game-reset', room.getPublicState());
          }, 2000); // Esperar 2 segundos para que se escuchen los sonidos de turno
        }
      } else {
        // La ronda no está completa, cambiar roles para que juegue el otro
        setTimeout(() => {
          room.switchRoles();

          // Resetear estado del juego para el siguiente turno
          room.gameState = {
            word: '',
            guessedLetters: [],
            attemptsLeft: room.settings.maxAttempts || 6,
            maxAttempts: room.settings.maxAttempts || 6,
            gameOver: false,
            won: false
          };

          io.to(roomCode).emit('game-reset', room.getPublicState());
        }, 2000); // Esperar 2 segundos para que se escuchen los sonidos de turno
      }
    }
  });

  // Nueva partida completa (reiniciar todo desde cero)
  socket.on('new-match', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      return;
    }

    // Resetear todo
    room.currentRound = 1;
    room.currentSetter = 'host';
    room.scores = { host: 0, guest: 0 };
    room.roundResults = [];
    room.gameState = {
      word: '',
      guessedLetters: [],
      attemptsLeft: room.settings.maxAttempts || 6,
      maxAttempts: room.settings.maxAttempts || 6,
      gameOver: false,
      won: false
    };

    io.to(roomCode).emit('match-reset', room.getPublicState());
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    
    for (const [roomCode, room] of rooms.entries()) {
      if (room.hostId === socket.id || room.guestId === socket.id) {
        io.to(roomCode).emit('player-disconnected');
        rooms.delete(roomCode);
        console.log(`Sala ${roomCode} eliminada`);
      }
    }
  });
});

// Limpiar salas viejas cada 30 minutos
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;
  
  for (const [roomCode, room] of rooms.entries()) {
    if (now - room.createdAt > maxAge) {
      rooms.delete(roomCode);
      console.log(`Sala ${roomCode} eliminada por inactividad`);
    }
  }
}, 30 * 60 * 1000);

// Todas las demás rutas sirven el frontend (debe ir al final)
app.get('*', (req, res) => {
  res.sendFile(join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
