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
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Conectado al servidor');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor');
      this.connected = false;
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
