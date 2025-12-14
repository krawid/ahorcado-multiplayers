# Ahorcado Multiplayer

Juego del ahorcado con modo multijugador en tiempo real.

## Características

- Modo un jugador (contra el ordenador)
- Modo multijugador (dos jugadores en tiempo real)
- WebSockets para sincronización
- PWA con soporte offline
- Accesible con lectores de pantalla

## Tecnologías

### Backend
- Node.js
- Express
- Socket.io

### Frontend
- React
- Vite
- Socket.io Client

## Desarrollo Local

```bash
# Instalar dependencias del servidor
npm install

# Instalar dependencias del cliente
cd client
npm install
cd ..

# Desarrollo (solo backend)
npm run dev

# Build del frontend
npm run build

# Producción
npm start
```

## Despliegue en Railway

1. Conecta el repositorio de GitHub
2. Railway detectará Node.js automáticamente
3. Ejecutará `npm run build` y luego `npm start`
4. El servidor servirá el frontend compilado

## Variables de Entorno

- `PORT`: Puerto del servidor (Railway lo asigna automáticamente)

## Estructura

```
ahorcado-multiplayer/
├── server/           # Backend (Express + Socket.io)
│   └── index.js
├── client/           # Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   └── package.json
├── package.json      # Dependencias del servidor
└── README.md
```
