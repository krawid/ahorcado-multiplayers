/**
 * Utilidades para gestionar accesibilidad con ARIA
 * Maneja anuncios a lectores de pantalla, etiquetas ARIA y gestión de foco
 */

// Referencias a regiones ARIA live
let politeRegion = null;
let assertiveRegion = null;
let focusTrapElements = null;
let lastFocusedElement = null;

/**
 * Inicializa las regiones ARIA live en el documento
 * Debe llamarse al montar la aplicación
 */
export function initializeAriaRegions() {
  // Crear región polite si no existe
  if (!politeRegion) {
    politeRegion = document.createElement('div');
    politeRegion.setAttribute('role', 'status');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only'; // Clase para ocultar visualmente pero mantener accesible
    politeRegion.style.position = 'absolute';
    politeRegion.style.left = '-10000px';
    politeRegion.style.width = '1px';
    politeRegion.style.height = '1px';
    politeRegion.style.overflow = 'hidden';
    document.body.appendChild(politeRegion);
  }

  // Crear región assertive si no existe
  if (!assertiveRegion) {
    assertiveRegion = document.createElement('div');
    assertiveRegion.setAttribute('role', 'alert');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    assertiveRegion.style.position = 'absolute';
    assertiveRegion.style.left = '-10000px';
    assertiveRegion.style.width = '1px';
    assertiveRegion.style.height = '1px';
    assertiveRegion.style.overflow = 'hidden';
    document.body.appendChild(assertiveRegion);
  }
}

/**
 * Anuncia un mensaje a los lectores de pantalla
 * @param {string} message - Mensaje a anunciar
 * @param {string} priority - Prioridad: 'polite' (por defecto) o 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  // Asegurar que las regiones existen
  if (!politeRegion || !assertiveRegion) {
    initializeAriaRegions();
  }

  const region = priority === 'assertive' ? assertiveRegion : politeRegion;

  // Limpiar el contenido anterior
  region.textContent = '';

  // Usar setTimeout para forzar al lector de pantalla a detectar el cambio
  setTimeout(() => {
    region.textContent = message;
  }, 100);

  // Limpiar después de 5 segundos para evitar acumulación
  setTimeout(() => {
    if (region.textContent === message) {
      region.textContent = '';
    }
  }, 5000);
}

/**
 * Establece una etiqueta ARIA en un elemento
 * @param {HTMLElement} element - Elemento al que agregar la etiqueta
 * @param {string} label - Texto de la etiqueta
 */
export function setAriaLabel(element, label) {
  if (!element) {
    console.warn('No se puede establecer aria-label: elemento no válido');
    return;
  }

  element.setAttribute('aria-label', label);
}

/**
 * Establece una descripción ARIA en un elemento
 * @param {HTMLElement} element - Elemento al que agregar la descripción
 * @param {string} description - Texto de la descripción
 */
export function setAriaDescription(element, description) {
  if (!element) {
    console.warn('No se puede establecer aria-description: elemento no válido');
    return;
  }

  element.setAttribute('aria-description', description);
}

/**
 * Captura el foco dentro de un modal
 * @param {HTMLElement} modalElement - Elemento del modal
 */
export function trapFocusInModal(modalElement) {
  if (!modalElement) {
    console.warn('No se puede capturar foco: elemento modal no válido');
    return;
  }

  // Guardar el elemento que tenía el foco antes del modal
  lastFocusedElement = document.activeElement;

  // Obtener todos los elementos enfocables dentro del modal
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  focusTrapElements = Array.from(modalElement.querySelectorAll(focusableSelectors));

  if (focusTrapElements.length === 0) {
    console.warn('No hay elementos enfocables en el modal');
    return;
  }

  // Enfocar el primer elemento
  focusTrapElements[0].focus();

  // Agregar listener para capturar Tab
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') {
      return;
    }

    const firstElement = focusTrapElements[0];
    const lastElement = focusTrapElements[focusTrapElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: si estamos en el primero, ir al último
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: si estamos en el último, ir al primero
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  // Guardar el handler para poder removerlo después
  modalElement._focusTrapHandler = handleKeyDown;
  document.addEventListener('keydown', handleKeyDown);

  // Establecer atributos ARIA
  modalElement.setAttribute('role', 'dialog');
  modalElement.setAttribute('aria-modal', 'true');
}

/**
 * Libera la captura de foco y restaura el foco anterior
 */
export function releaseFocusTrap() {
  // Remover el event listener si existe
  const modals = document.querySelectorAll('[role="dialog"]');
  modals.forEach(modal => {
    if (modal._focusTrapHandler) {
      document.removeEventListener('keydown', modal._focusTrapHandler);
      delete modal._focusTrapHandler;
    }
  });

  // Restaurar el foco al elemento anterior
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }

  // Limpiar referencias
  focusTrapElements = null;
  lastFocusedElement = null;
}

/**
 * Asegura que un elemento sea accesible por teclado
 * @param {HTMLElement} element - Elemento a hacer accesible
 * @param {Function} onClick - Función a ejecutar al activar
 */
export function ensureKeyboardAccessible(element, onClick) {
  if (!element) {
    console.warn('No se puede hacer accesible: elemento no válido');
    return;
  }

  // Si no es naturalmente enfocable, agregar tabindex
  const naturallyFocusable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
  
  if (!naturallyFocusable && !element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }

  // Agregar role si no tiene uno semántico
  if (!element.hasAttribute('role') && !naturallyFocusable) {
    element.setAttribute('role', 'button');
  }

  // Agregar listener para Enter y Space
  if (onClick) {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    
    // Guardar referencia para poder removerlo después si es necesario
    element._keyboardHandler = handleKeyDown;
  }
}

/**
 * Remueve los listeners de accesibilidad de teclado de un elemento
 * @param {HTMLElement} element - Elemento del que remover listeners
 */
export function removeKeyboardAccessibility(element) {
  if (!element) {
    return;
  }

  if (element._keyboardHandler) {
    element.removeEventListener('keydown', element._keyboardHandler);
    delete element._keyboardHandler;
  }
}

/**
 * Establece el estado expandido/colapsado de un elemento
 * @param {HTMLElement} element - Elemento a actualizar
 * @param {boolean} expanded - True si está expandido
 */
export function setAriaExpanded(element, expanded) {
  if (!element) {
    return;
  }

  element.setAttribute('aria-expanded', expanded.toString());
}

/**
 * Establece si un elemento está deshabilitado
 * @param {HTMLElement} element - Elemento a actualizar
 * @param {boolean} disabled - True si está deshabilitado
 */
export function setAriaDisabled(element, disabled) {
  if (!element) {
    return;
  }

  element.setAttribute('aria-disabled', disabled.toString());
  
  // También actualizar tabindex para prevenir foco
  if (disabled) {
    element.setAttribute('tabindex', '-1');
  } else {
    element.setAttribute('tabindex', '0');
  }
}

/**
 * Limpia todas las regiones ARIA y listeners
 */
export function cleanupAriaUtils() {
  // Remover regiones ARIA
  if (politeRegion && politeRegion.parentNode) {
    politeRegion.parentNode.removeChild(politeRegion);
    politeRegion = null;
  }

  if (assertiveRegion && assertiveRegion.parentNode) {
    assertiveRegion.parentNode.removeChild(assertiveRegion);
    assertiveRegion = null;
  }

  // Liberar focus trap si está activo
  releaseFocusTrap();
}
