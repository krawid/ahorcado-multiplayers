/**
 * Utilidades para gestionar el almacenamiento local (Local Storage)
 * Maneja la persistencia de configuraciones, palabras personalizadas y estado del juego
 */

// Claves para Local Storage
const STORAGE_KEYS = {
  SETTINGS: 'ahorcado_settings',
  CUSTOM_WORDS: 'ahorcado_custom_words',
  GAME_STATE: 'ahorcado_game_state'
};

/**
 * Verifica si Local Storage está disponible
 * @returns {boolean} True si Local Storage está disponible
 */
function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    console.warn('Local Storage no está disponible:', e);
    return false;
  }
}

/**
 * Guarda las configuraciones del juego en Local Storage
 * @param {Object} settings - Configuraciones del juego
 * @param {string} settings.category - Categoría seleccionada
 * @param {string} settings.difficulty - Nivel de dificultad
 * @param {boolean} settings.soundEnabled - Si el sonido está habilitado
 */
export function saveSettings(settings) {
  if (!isLocalStorageAvailable()) {
    console.warn('No se pueden guardar las configuraciones: Local Storage no disponible');
    return;
  }

  try {
    const settingsData = {
      category: settings.category || 'Animales',
      difficulty: settings.difficulty || 'Normal',
      soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : true
    };
    
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsData));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('Local Storage lleno. No se pueden guardar las configuraciones.');
    } else {
      console.error('Error al guardar configuraciones:', e);
    }
  }
}

/**
 * Carga las configuraciones del juego desde Local Storage
 * @returns {Object|null} Configuraciones guardadas o null si no existen
 */
export function loadSettings() {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    
    if (!settingsJson) {
      return null;
    }

    const settings = JSON.parse(settingsJson);
    
    // Validar estructura
    if (typeof settings.category !== 'string' || 
        typeof settings.difficulty !== 'string' ||
        typeof settings.soundEnabled !== 'boolean') {
      console.warn('Configuraciones corruptas, retornando null');
      return null;
    }

    return settings;
  } catch (e) {
    console.error('Error al cargar configuraciones:', e);
    // Limpiar datos corruptos
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    return null;
  }
}

/**
 * Guarda las palabras personalizadas en Local Storage
 * @param {Object} customWords - Objeto con categorías y sus palabras personalizadas
 */
export function saveCustomWords(customWords) {
  if (!isLocalStorageAvailable()) {
    console.warn('No se pueden guardar palabras personalizadas: Local Storage no disponible');
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_WORDS, JSON.stringify(customWords));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('Local Storage lleno. No se pueden guardar palabras personalizadas.');
    } else {
      console.error('Error al guardar palabras personalizadas:', e);
    }
  }
}

/**
 * Carga las palabras personalizadas desde Local Storage
 * @returns {Object} Objeto con categorías y palabras personalizadas (vacío si no hay datos)
 */
export function loadCustomWords() {
  if (!isLocalStorageAvailable()) {
    return {};
  }

  try {
    const customWordsJson = localStorage.getItem(STORAGE_KEYS.CUSTOM_WORDS);
    
    if (!customWordsJson) {
      return {};
    }

    const customWords = JSON.parse(customWordsJson);
    
    // Validar que es un objeto
    if (typeof customWords !== 'object' || customWords === null || Array.isArray(customWords)) {
      console.warn('Palabras personalizadas corruptas, retornando objeto vacío');
      return {};
    }

    return customWords;
  } catch (e) {
    console.error('Error al cargar palabras personalizadas:', e);
    // Limpiar datos corruptos
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_WORDS);
    return {};
  }
}

/**
 * Guarda el estado actual del juego en Local Storage
 * @param {Object} state - Estado del juego
 * @param {string} state.word - Palabra actual
 * @param {string} state.category - Categoría actual
 * @param {string} state.difficulty - Dificultad actual
 * @param {string[]} state.guessedLetters - Letras adivinadas
 * @param {number} state.maxAttempts - Intentos máximos
 * @param {number} state.attemptsLeft - Intentos restantes
 * @param {boolean} state.gameOver - Si el juego terminó
 * @param {boolean} state.won - Si ganó el juego
 * @param {string} state.lastMessage - Último mensaje
 */
export function saveGameState(state) {
  if (!isLocalStorageAvailable()) {
    console.warn('No se puede guardar el estado del juego: Local Storage no disponible');
    return;
  }

  try {
    const gameStateData = {
      word: state.word,
      category: state.category,
      difficulty: state.difficulty,
      guessedLetters: state.guessedLetters || [],
      maxAttempts: state.maxAttempts,
      attemptsLeft: state.attemptsLeft,
      gameOver: state.gameOver,
      won: state.won,
      lastMessage: state.lastMessage || ''
    };
    
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(gameStateData));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('Local Storage lleno. No se puede guardar el estado del juego.');
    } else {
      console.error('Error al guardar estado del juego:', e);
    }
  }
}

/**
 * Carga el estado del juego desde Local Storage
 * @returns {Object|null} Estado del juego guardado o null si no existe
 */
export function loadGameState() {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const gameStateJson = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    
    if (!gameStateJson) {
      return null;
    }

    const state = JSON.parse(gameStateJson);
    
    // Validar estructura básica
    if (typeof state.word !== 'string' ||
        typeof state.category !== 'string' ||
        typeof state.difficulty !== 'string' ||
        !Array.isArray(state.guessedLetters) ||
        typeof state.maxAttempts !== 'number' ||
        typeof state.attemptsLeft !== 'number' ||
        typeof state.gameOver !== 'boolean' ||
        typeof state.won !== 'boolean') {
      console.warn('Estado del juego corrupto, retornando null');
      return null;
    }

    return state;
  } catch (e) {
    console.error('Error al cargar estado del juego:', e);
    // Limpiar datos corruptos
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    return null;
  }
}

/**
 * Elimina el estado del juego guardado de Local Storage
 */
export function clearGameState() {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  } catch (e) {
    console.error('Error al limpiar estado del juego:', e);
  }
}

/**
 * Limpia todos los datos almacenados (útil para reset completo)
 */
export function clearAllData() {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_WORDS);
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  } catch (e) {
    console.error('Error al limpiar todos los datos:', e);
  }
}
