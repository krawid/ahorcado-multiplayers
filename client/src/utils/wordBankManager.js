/**
 * Utilidades para gestionar el banco de palabras
 * Maneja palabras personalizadas, categorías y fusión con palabras por defecto
 */

import { WORD_BANK } from '../gameLogic.js';
import { saveCustomWords, loadCustomWords } from './storageUtils.js';

/**
 * Obtiene todas las categorías disponibles (por defecto y personalizadas)
 * @returns {string[]} Array con nombres de todas las categorías
 */
export function getCategories() {
  const customWords = loadCustomWords();
  const defaultCategories = Object.keys(WORD_BANK);
  const customCategories = Object.keys(customWords);
  
  // Combinar y eliminar duplicados
  const allCategories = [...new Set([...defaultCategories, ...customCategories])];
  
  return allCategories.sort();
}

/**
 * Obtiene todas las palabras de una categoría (fusiona por defecto y personalizadas)
 * @param {string} category - Nombre de la categoría
 * @returns {string[]} Array con todas las palabras de la categoría, ordenadas alfabéticamente
 */
export function getAllWords(category) {
  const customWords = loadCustomWords();
  
  const defaultWords = WORD_BANK[category] || [];
  const customCategoryWords = customWords[category] || [];
  
  // Combinar y eliminar duplicados
  const allWords = [...new Set([...defaultWords, ...customCategoryWords])];
  
  return allWords.sort();
}

/**
 * Valida que una palabra solo contenga caracteres alfabéticos
 * @param {string} word - Palabra a validar
 * @returns {boolean} True si la palabra es válida
 */
function isValidWord(word) {
  return typeof word === 'string' && /^[A-ZÁÉÍÓÚÑ]+$/i.test(word.trim());
}

/**
 * Agrega palabras personalizadas a una categoría existente o nueva
 * @param {string} category - Nombre de la categoría
 * @param {string[]} words - Array de palabras a agregar
 * @returns {Object} Resultado de la operación
 */
export function addCustomWords(category, words) {
  // Validar entrada
  if (!category || typeof category !== 'string') {
    return {
      success: false,
      message: 'El nombre de la categoría es inválido.'
    };
  }

  if (!Array.isArray(words) || words.length === 0) {
    return {
      success: false,
      message: 'Debes proporcionar al menos una palabra.'
    };
  }

  // Normalizar y validar palabras
  const normalizedWords = [];
  const invalidWords = [];
  
  for (let word of words) {
    const trimmed = word.trim().toUpperCase();
    
    if (!isValidWord(trimmed)) {
      invalidWords.push(word);
    } else if (!normalizedWords.includes(trimmed)) {
      normalizedWords.push(trimmed);
    }
  }

  if (invalidWords.length > 0) {
    return {
      success: false,
      message: `Las siguientes palabras son inválidas (solo se permiten letras): ${invalidWords.join(', ')}`
    };
  }

  if (normalizedWords.length === 0) {
    return {
      success: false,
      message: 'No hay palabras válidas para agregar.'
    };
  }

  // Cargar palabras personalizadas existentes
  const customWords = loadCustomWords();
  
  // Agregar nuevas palabras a la categoría
  if (!customWords[category]) {
    customWords[category] = [];
  }
  
  // Agregar solo palabras que no existan ya
  let addedCount = 0;
  for (let word of normalizedWords) {
    if (!customWords[category].includes(word)) {
      customWords[category].push(word);
      addedCount++;
    }
  }

  // Guardar cambios
  saveCustomWords(customWords);

  return {
    success: true,
    message: `Se agregaron ${addedCount} palabra(s) a la categoría "${category}".`,
    addedCount
  };
}

/**
 * Elimina palabras personalizadas de una categoría (preserva palabras por defecto)
 * @param {string} category - Nombre de la categoría
 * @param {string[]} words - Array de palabras a eliminar
 * @returns {Object} Resultado de la operación
 */
export function removeCustomWords(category, words) {
  // Validar entrada
  if (!category || typeof category !== 'string') {
    return {
      success: false,
      message: 'El nombre de la categoría es inválido.'
    };
  }

  if (!Array.isArray(words) || words.length === 0) {
    return {
      success: false,
      message: 'Debes proporcionar al menos una palabra para eliminar.'
    };
  }

  // Cargar palabras personalizadas
  const customWords = loadCustomWords();
  
  if (!customWords[category] || customWords[category].length === 0) {
    return {
      success: false,
      message: `No hay palabras personalizadas en la categoría "${category}".`
    };
  }

  // Normalizar palabras a eliminar
  const wordsToRemove = words.map(w => w.trim().toUpperCase());
  
  // Filtrar palabras personalizadas
  const originalLength = customWords[category].length;
  customWords[category] = customWords[category].filter(word => !wordsToRemove.includes(word));
  
  const removedCount = originalLength - customWords[category].length;

  // Si la categoría quedó vacía, eliminarla
  if (customWords[category].length === 0) {
    delete customWords[category];
  }

  // Guardar cambios
  saveCustomWords(customWords);

  return {
    success: true,
    message: `Se eliminaron ${removedCount} palabra(s) de la categoría "${category}".`,
    removedCount
  };
}

/**
 * Crea una nueva categoría con palabras personalizadas
 * @param {string} category - Nombre de la nueva categoría
 * @param {string[]} words - Array de palabras para la categoría
 * @returns {Object} Resultado de la operación
 */
export function createCategory(category, words) {
  // Validar entrada
  if (!category || typeof category !== 'string') {
    return {
      success: false,
      message: 'El nombre de la categoría es inválido.'
    };
  }

  const trimmedCategory = category.trim();
  
  if (trimmedCategory.length === 0) {
    return {
      success: false,
      message: 'El nombre de la categoría no puede estar vacío.'
    };
  }

  // Verificar si la categoría ya existe
  const existingCategories = getCategories();
  if (existingCategories.includes(trimmedCategory)) {
    return {
      success: false,
      message: `La categoría "${trimmedCategory}" ya existe. Usa addCustomWords para agregar palabras.`
    };
  }

  // Usar addCustomWords para agregar las palabras
  return addCustomWords(trimmedCategory, words);
}

/**
 * Elimina una categoría personalizada completa
 * Si es la categoría activa, cambia a una categoría por defecto
 * @param {string} category - Nombre de la categoría a eliminar
 * @returns {Object} Resultado de la operación
 */
export function deleteCategory(category) {
  // Validar entrada
  if (!category || typeof category !== 'string') {
    return {
      success: false,
      message: 'El nombre de la categoría es inválido.'
    };
  }

  // No permitir eliminar categorías por defecto
  if (WORD_BANK[category]) {
    return {
      success: false,
      message: `No se puede eliminar la categoría por defecto "${category}". Solo puedes eliminar categorías personalizadas.`
    };
  }

  // Cargar palabras personalizadas
  const customWords = loadCustomWords();
  
  if (!customWords[category]) {
    return {
      success: false,
      message: `La categoría "${category}" no existe o no es una categoría personalizada.`
    };
  }

  // Eliminar la categoría
  delete customWords[category];
  
  // Guardar cambios
  saveCustomWords(customWords);

  // Sugerir categoría de respaldo
  const fallbackCategory = Object.keys(WORD_BANK)[0] || 'Animales';

  return {
    success: true,
    message: `La categoría "${category}" ha sido eliminada.`,
    fallbackCategory
  };
}
