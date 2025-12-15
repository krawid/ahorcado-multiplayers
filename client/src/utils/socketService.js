import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.heartbeatInterval = null;
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
      reconnectionAttempts: Infinity, // Intentar reconectar indefinidamente
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true
    });

    this.socket.on('connect', () => {
      console.log('Conectado al servidor');
      this.connected = true;
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado del servidor:', reason);
      this.connected = false;
      this.stopHeartbeat();
      
      // Si la desconexión fue por el servidor, intentar reconectar
      if (reason === 'io server disconnect') {
        console.log('Servidor desconectó, reconectando...');
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconectado después de', attemptNumber, 'intentos');
      this.connected = true;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Intento de reconexión', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Falló la reconexión');
    });

    this.socket.on('pong', () => {
      console.log('Pong recibido del servidor');
    });

    return this.socket;
  }

  // Sistema de heartbeat para mantener la conexión activa
  startHeartbeat() {
    // Enviar ping cada 15 segundos para mantener la conexión activa
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connected) {
        console.log('Enviando ping al servidor...');
        this.socket.emit('ping');
      }
    }, 15000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
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
