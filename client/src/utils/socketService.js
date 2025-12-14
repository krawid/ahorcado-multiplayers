import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }

    // En producción usa la misma URL, en desarrollo usa localhost
    const url = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Conectado al servidor');
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado del servidor:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconectado después de', attemptNumber, 'intentos');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Intento de reconexión', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Falló la reconexión');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.connected;
  }
}

export const socketService = new SocketService();
