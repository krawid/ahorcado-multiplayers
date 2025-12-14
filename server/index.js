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
      playersReady: this.isReady()
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
    
    io.to(room.hostId).emit('player-joined');
    
    callback({ 
      success: true, 
      roomCode,
      role: 'guest'
    });

    io.to(roomCode).emit('game-state', room.getPublicState());
  });

  // Host establece la palabra
  socket.on('set-word', (roomCode, word) => {
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      return;
    }

    room.startGame(word);
    
    console.log(`Palabra establecida en sala ${roomCode}`);
    
    io.to(roomCode).emit('game-started', room.getPublicState());
  });

  // Adivinar letra
  socket.on('guess-letter', (roomCode, letter) => {
    const room = rooms.get(roomCode);
    
    if (!room || room.guestId !== socket.id) {
      return;
    }

    const result = room.guessLetter(letter);
    
    io.to(roomCode).emit('guess-result', {
      letter,
      correct: result.correct,
      gameState: room.getPublicState()
    });
  });

  // Nueva partida
  socket.on('new-game', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      return;
    }

    room.gameState = {
      word: '',
      guessedLetters: [],
      attemptsLeft: room.settings.maxAttempts || 6,
      maxAttempts: room.settings.maxAttempts || 6,
      gameOver: false,
      won: false
    };

    io.to(roomCode).emit('game-reset', room.getPublicState());
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
