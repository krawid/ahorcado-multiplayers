// Service Worker para PWA - Ahorcado
const CACHE_NAME = 'ahorcado-pwa-v1';
const RUNTIME_CACHE = 'ahorcado-runtime-v1';

// Archivos a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch((error) => {
        console.error('[SW] Error en instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Eliminar cachés antiguos
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activación completada');
        return self.clients.claim(); // Tomar control inmediatamente
      })
  );
});

// Interceptar peticiones (fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cachear peticiones del mismo origen
  if (url.origin !== location.origin) {
    return;
  }

  // Estrategia: Cache-first para assets estáticos, Network-first para el resto
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// Verificar si es un asset estático
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.endsWith(ext));
}

// Estrategia Cache-First (para assets estáticos)
async function cacheFirst(request) {
  try {
    // Intentar obtener del caché primero
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Sirviendo desde caché:', request.url);
      return cachedResponse;
    }

    // Si no está en caché, obtener de la red
    console.log('[SW] Obteniendo de red:', request.url);
    const networkResponse = await fetch(request);

    // Cachear la respuesta para futuras peticiones
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Error en cache-first:', error);
    
    // Si falla todo, intentar devolver una respuesta del caché
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback para navegación
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }

    throw error;
  }
}

// Estrategia Network-First (para contenido dinámico)
async function networkFirst(request) {
  try {
    // Intentar obtener de la red primero
    console.log('[SW] Obteniendo de red:', request.url);
    const networkResponse = await fetch(request);

    // Cachear la respuesta
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Red no disponible, intentando caché:', request.url);
    
    // Si falla la red, intentar obtener del caché
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Sirviendo desde caché (offline):', request.url);
      return cachedResponse;
    }

    // Si es navegación y no hay caché, devolver index.html
    if (request.mode === 'navigate') {
      const indexCache = await caches.match('/index.html');
      if (indexCache) {
        return indexCache;
      }
    }

    throw error;
  }
}

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
