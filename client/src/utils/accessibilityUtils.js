/**
 * Utilidades de accesibilidad para lectores de pantalla
 * Gestiona ARIA live regions, focus management y navegación por teclado
 */

// Referencias a elementos ARIA live
let ariaLivePolite = null;
let ariaLiveAssertive = null;
let focusTrapElements = [];
let lastFocusedElement = null;

/**
 * Inicializa las regiones ARIA live
 * Debe llamarse al montar la aplicación
 */
export function initAriaLiveRegions() {
  // Crear región polite si no existe
  if (!ariaLivePolite) {
    ariaLivePolite = document.createElement('div');
    ariaLivePolite.setAttribute('role', 'status');
    ariaLivePolite.setAttribute('aria-live', 'polite');
    ariaLivePolite.setAttribute('aria-atomic', 'true');
    ariaLivePolite.className = 'sr-only'; // Visually hidden
    document.body.appendChild(ariaLivePolite);
  }

  // Crear región assertive si no existe
  if (!ariaLiveAssertive) {
    ariaLiveAssertive = document.createElement('div');
    ariaLiveAssertive.setAttribute('role', 'alert');
    ariaLiveAssertive.setAttribute('aria-live', 'assertive');
    ariaLiveAssertive.setAttribute('aria-atomic', 'true');
    ariaLiveAssertive.className = 'sr-only'; // Visually hidden
    document.body.appendChild(ariaLiveAssertive);
  }
}

/**
 * Anuncia un mensaje a lectores de pantalla
 * @param {string} message - Mensaje a anunciar
 * @param {string} priority - 'polite' o 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  // Asegurar que las regiones existen
  if (!ariaLivePolite || !ariaLiveAssertive) {
    initAriaLiveRegions();
  }

  const region = priority === 'assertive' ? ariaLiveAssertive : ariaLivePolite;
  
  // Limpiar primero para forzar re-anuncio
  region.textContent = '';
  
  // Usar setTimeout para asegurar que el lector detecta el cambio
  setTimeout(() => {
    region.textContent = message;
  }, 100);

  // Limpiar después de un tiempo
  setTimeout(() => {
    region.textContent = '';
  }, 5000);
}

/**
 * Establece un label ARIA en un elemento
 * @param {HTMLElement} element - Elemento a etiquetar
 * @param {string} label - Texto del label
 */
export function setAriaLabel(element, label) {
  if (!element) return;
  element.setAttribute('aria-label', label);
}

/**
 * Establece una descripción ARIA en un elemento
 * @param {HTMLElement} element - Elemento a describir
 * @param {string} description - Texto de la descripción
 */
export function setAriaDescription(element, description) {
  if (!element) return;
  element.setAttribute('aria-description', description);
}

/**
 * Marca un elemento como región landmark
 * @param {HTMLElement} element - Elemento
 * @param {string} role - Rol ARIA (navigation, main, complementary, etc.)
 * @param {string} label - Label opcional para la región
 */
export function setLandmarkRole(element, role, label = null) {
  if (!element) return;
  element.setAttribute('role', role);
  if (label) {
    element.setAttribute('aria-label', label);
  }
}

/**
 * Configura un elemento como botón accesible
 * @param {HTMLElement} element - Elemento
 * @param {string} label - Label del botón
 * @param {Function} onClick - Handler de click
 */
export function makeButtonAccessible(element, label, onClick) {
  if (!element) return;
  
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', label);
  element.setAttribute('tabindex', '0');
  
  // Click handler
  element.addEventListener('click', onClick);
  
  // Keyboard handler (Enter y Space)
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  });
}

/**
 * Atrapa el foco dentro de un modal
 * @param {HTMLElement} modalElement - Elemento del modal
 */
export function trapFocusInModal(modalElement) {
  if (!modalElement) return;

  // Guardar el elemento que tenía el foco antes
  lastFocusedElement = document.activeElement;

  // Obtener todos los elementos focusables dentro del modal
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  focusTrapElements = Array.from(focusableElements);
  
  if (focusTrapElements.length === 0) return;

  const firstElement = focusTrapElements[0];
  const lastElement = focusTrapElements[focusTrapElements.length - 1];

  // Handler para atrapar el foco
  const trapFocusHandler = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  // Agregar listener
  modalElement.addEventListener('keydown', trapFocusHandler);
  modalElement.setAttribute('data-focus-trap', 'true');

  // Enfocar el primer elemento
  setTimeout(() => {
    firstElement.focus();
  }, 100);
}

/**
 * Libera el trap de foco y restaura el foco anterior
 */
export function releaseFocusTrap() {
  // Remover listeners de todos los modales con trap
  const modalsWithTrap = document.querySelectorAll('[data-focus-trap="true"]');
  modalsWithTrap.forEach(modal => {
    modal.removeAttribute('data-focus-trap');
    // Los listeners se limpiarán automáticamente al remover el modal del DOM
  });

  focusTrapElements = [];

  // Restaurar foco al elemento anterior
  if (lastFocusedElement) {
    setTimeout(() => {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }, 100);
  }
}

/**
 * Asegura que un elemento sea accesible por teclado
 * @param {HTMLElement} element - Elemento
 */
export function ensureKeyboardAccessible(element) {
  if (!element) return;

  // Si no tiene tabindex, agregarlo
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }

  // Si es un elemento interactivo sin rol, agregar rol apropiado
  const tagName = element.tagName.toLowerCase();
  if (!element.hasAttribute('role')) {
    if (tagName === 'div' || tagName === 'span') {
      element.setAttribute('role', 'button');
    }
  }
}

/**
 * Configura navegación por teclado para una lista
 * @param {HTMLElement} listElement - Elemento contenedor de la lista
 * @param {string} itemSelector - Selector para los items de la lista
 */
export function setupListKeyboardNavigation(listElement, itemSelector) {
  if (!listElement) return;

  listElement.setAttribute('role', 'list');
  
  const items = listElement.querySelectorAll(itemSelector);
  items.forEach((item, index) => {
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    
    item.addEventListener('keydown', (e) => {
      let targetIndex = index;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          targetIndex = Math.min(index + 1, items.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          targetIndex = Math.max(index - 1, 0);
          break;
        case 'Home':
          e.preventDefault();
          targetIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          targetIndex = items.length - 1;
          break;
        default:
          return;
      }
      
      // Actualizar tabindex y enfocar
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === targetIndex ? '0' : '-1');
      });
      items[targetIndex].focus();
    });
  });
}

/**
 * Anuncia el estado actual del juego de forma detallada
 * @param {Object} gameState - Estado del juego
 */
export function announceGameState(gameState) {
  const { category, difficulty, attemptsLeft, maxAttempts, guessedLetters, displayWord } = gameState;
  
  let announcement = `Categoría: ${category}. `;
  announcement += `Dificultad: ${difficulty}. `;
  announcement += `Intentos restantes: ${attemptsLeft} de ${maxAttempts}. `;
  
  if (guessedLetters && guessedLetters.length > 0) {
    announcement += `Letras usadas: ${guessedLetters.join(', ')}. `;
  }
  
  if (displayWord) {
    announcement += `Palabra: ${displayWord.split('').join(', ')}`;
  }
  
  announceToScreenReader(announcement, 'polite');
}

/**
 * Anuncia el resultado de adivinar una letra
 * @param {boolean} correct - Si la letra fue correcta
 * @param {string} letter - Letra adivinada
 * @param {string} displayWord - Palabra actual con guiones
 */
export function announceLetterResult(correct, letter, displayWord) {
  let announcement = correct 
    ? `¡Correcto! La letra ${letter} está en la palabra. `
    : `Incorrecto. La letra ${letter} no está en la palabra. `;
  
  announcement += `Palabra actual: ${displayWord.split('').join(', ')}`;
  
  announceToScreenReader(announcement, 'assertive');
}

/**
 * Anuncia el fin del juego
 * @param {boolean} won - Si ganó o perdió
 * @param {string} word - La palabra completa
 */
export function announceGameOver(won, word) {
  const announcement = won
    ? `¡Felicidades! Has ganado. La palabra era: ${word.split('').join(', ')}`
    : `Has perdido. La palabra era: ${word.split('').join(', ')}`;
  
  announceToScreenReader(announcement, 'assertive');
}

/**
 * Limpia las regiones ARIA live
 */
export function cleanupAriaLiveRegions() {
  if (ariaLivePolite && ariaLivePolite.parentNode) {
    ariaLivePolite.parentNode.removeChild(ariaLivePolite);
    ariaLivePolite = null;
  }
  
  if (ariaLiveAssertive && ariaLiveAssertive.parentNode) {
    ariaLiveAssertive.parentNode.removeChild(ariaLiveAssertive);
    ariaLiveAssertive = null;
  }
}

/**
 * Verifica si un elemento es visible para lectores de pantalla
 * @param {HTMLElement} element - Elemento a verificar
 * @returns {boolean}
 */
export function isAccessible(element) {
  if (!element) return false;
  
  // Verificar aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') return false;
  
  // Verificar display y visibility
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  
  return true;
}

export default {
  initAriaLiveRegions,
  announceToScreenReader,
  setAriaLabel,
  setAriaDescription,
  setLandmarkRole,
  makeButtonAccessible,
  trapFocusInModal,
  releaseFocusTrap,
  ensureKeyboardAccessible,
  setupListKeyboardNavigation,
  announceGameState,
  announceLetterResult,
  announceGameOver,
  cleanupAriaLiveRegions,
  isAccessible
};
