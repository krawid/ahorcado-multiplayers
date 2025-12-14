import { useState, useEffect, useRef } from 'react';
import { 
  getCategories, 
  getAllWords, 
  addCustomWords, 
  removeCustomWords,
  createCategory,
  deleteCategory 
} from '../utils/wordBankManager.js';
import { announceToScreenReader, trapFocusInModal, releaseFocusTrap } from '../utils/ariaUtils.js';
import './WordManagementModal.css';

/**
 * Modal para gestionar palabras personalizadas
 * Permite agregar, ver, eliminar palabras y crear/eliminar categorías
 */
export default function WordManagementModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('add'); // 'add', 'view', 'delete', 'createCategory', 'deleteCategory'
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [wordsInput, setWordsInput] = useState('');
  const [wordsList, setWordsList] = useState([]);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  
  const modalRef = useRef(null);

  // Cargar categorías al montar
  useEffect(() => {
    loadCategories();
    
    // Capturar foco
    if (modalRef.current) {
      trapFocusInModal(modalRef.current);
    }

    return () => {
      releaseFocusTrap();
    };
  }, []);

  // Cargar palabras cuando cambia la categoría seleccionada
  useEffect(() => {
    if (selectedCategory && (activeTab === 'view' || activeTab === 'delete')) {
      const words = getAllWords(selectedCategory);
      setWordsList(words);
    }
  }, [selectedCategory, activeTab]);

  const loadCategories = () => {
    const cats = getCategories();
    setCategories(cats);
    if (cats.length > 0 && !selectedCategory) {
      setSelectedCategory(cats[0]);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    announceToScreenReader(msg, 'assertive');
    
    // Limpiar mensaje después de 5 segundos
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleAddWords = () => {
    if (!selectedCategory) {
      showMessage('Selecciona una categoría', 'error');
      return;
    }

    if (!wordsInput.trim()) {
      showMessage('Ingresa al menos una palabra', 'error');
      return;
    }

    // Separar palabras por comas, saltos de línea o espacios
    const words = wordsInput
      .split(/[,\n\s]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const result = addCustomWords(selectedCategory, words);
    
    if (result.success) {
      showMessage(result.message, 'success');
      setWordsInput('');
      loadCategories();
    } else {
      showMessage(result.message, 'error');
    }
  };

  const handleDeleteWords = () => {
    if (!selectedCategory) {
      showMessage('Selecciona una categoría', 'error');
      return;
    }

    if (selectedWords.size === 0) {
      showMessage('Selecciona al menos una palabra para eliminar', 'error');
      return;
    }

    const wordsToDelete = Array.from(selectedWords);
    const result = removeCustomWords(selectedCategory, wordsToDelete);
    
    if (result.success) {
      showMessage(result.message, 'success');
      setSelectedWords(new Set());
      loadCategories();
      // Recargar lista de palabras
      const words = getAllWords(selectedCategory);
      setWordsList(words);
    } else {
      showMessage(result.message, 'error');
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      showMessage('Ingresa un nombre para la categoría', 'error');
      return;
    }

    if (!wordsInput.trim()) {
      showMessage('Ingresa al menos una palabra para la nueva categoría', 'error');
      return;
    }

    const words = wordsInput
      .split(/[,\n\s]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const result = createCategory(newCategoryName.trim(), words);
    
    if (result.success) {
      showMessage(result.message, 'success');
      setNewCategoryName('');
      setWordsInput('');
      loadCategories();
      setSelectedCategory(newCategoryName.trim());
    } else {
      showMessage(result.message, 'error');
    }
  };

  const handleDeleteCategory = () => {
    if (!selectedCategory) {
      showMessage('Selecciona una categoría', 'error');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${selectedCategory}"?`)) {
      return;
    }

    const result = deleteCategory(selectedCategory);
    
    if (result.success) {
      showMessage(result.message, 'success');
      loadCategories();
      setSelectedCategory(result.fallbackCategory || '');
    } else {
      showMessage(result.message, 'error');
    }
  };

  const toggleWordSelection = (word) => {
    const newSelection = new Set(selectedWords);
    if (newSelection.has(word)) {
      newSelection.delete(word);
    } else {
      newSelection.add(word);
    }
    setSelectedWords(newSelection);
  };

  const handleClose = () => {
    releaseFocusTrap();
    onClose();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMessage('');
    setSelectedWords(new Set());
    announceToScreenReader(`Pestaña ${getTabLabel(tab)} seleccionada`, 'polite');
  };

  const getTabLabel = (tab) => {
    const labels = {
      add: 'Agregar Palabras',
      view: 'Ver Palabras',
      delete: 'Eliminar Palabras',
      createCategory: 'Crear Categoría',
      deleteCategory: 'Eliminar Categoría'
    };
    return labels[tab] || tab;
  };

  const handleTabKeyDown = (e) => {
    const tabs = ['add', 'view', 'delete', 'createCategory', 'deleteCategory'];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      handleTabChange(tabs[nextIndex]);
      // Enfocar la nueva pestaña
      setTimeout(() => {
        const tabButtons = e.currentTarget.querySelectorAll('[role="tab"]');
        tabButtons[nextIndex]?.focus();
      }, 0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      handleTabChange(tabs[prevIndex]);
      // Enfocar la nueva pestaña
      setTimeout(() => {
        const tabButtons = e.currentTarget.querySelectorAll('[role="tab"]');
        tabButtons[prevIndex]?.focus();
      }, 0);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        ref={modalRef}
        className="word-management-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="word-modal-title"
        aria-modal="true"
      >
        <h1 id="word-modal-title">Gestionar Palabras</h1>

        {/* Pestañas */}
        <div className="tabs" role="tablist" onKeyDown={handleTabKeyDown}>
          <button
            role="tab"
            aria-selected={activeTab === 'add'}
            aria-controls="tab-panel"
            tabIndex={activeTab === 'add' ? 0 : -1}
            className={`tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => handleTabChange('add')}
          >
            Agregar
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'view'}
            aria-controls="tab-panel"
            tabIndex={activeTab === 'view' ? 0 : -1}
            className={`tab ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => handleTabChange('view')}
          >
            Ver
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'delete'}
            aria-controls="tab-panel"
            tabIndex={activeTab === 'delete' ? 0 : -1}
            className={`tab ${activeTab === 'delete' ? 'active' : ''}`}
            onClick={() => handleTabChange('delete')}
          >
            Eliminar
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'createCategory'}
            aria-controls="tab-panel"
            tabIndex={activeTab === 'createCategory' ? 0 : -1}
            className={`tab ${activeTab === 'createCategory' ? 'active' : ''}`}
            onClick={() => handleTabChange('createCategory')}
          >
            Nueva Categoría
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'deleteCategory'}
            aria-controls="tab-panel"
            tabIndex={activeTab === 'deleteCategory' ? 0 : -1}
            className={`tab ${activeTab === 'deleteCategory' ? 'active' : ''}`}
            onClick={() => handleTabChange('deleteCategory')}
          >
            Eliminar Categoría
          </button>
        </div>

        {/* Contenido de las pestañas */}
        <div id="tab-panel" role="tabpanel" className="tab-content">
          {/* Agregar palabras */}
          {activeTab === 'add' && (
            <div className="tab-panel">
              <label htmlFor="add-category">Categoría:</label>
              <select
                id="add-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label htmlFor="add-words">Palabras (separadas por comas, espacios o saltos de línea):</label>
              <textarea
                id="add-words"
                value={wordsInput}
                onChange={(e) => setWordsInput(e.target.value)}
                placeholder="PERRO, GATO, ELEFANTE..."
                className="words-textarea"
                rows="5"
              />

              <button className="btn btn-primary" onClick={handleAddWords}>
                Agregar Palabras
              </button>
            </div>
          )}

          {/* Ver palabras */}
          {activeTab === 'view' && (
            <div className="tab-panel">
              <label htmlFor="view-category">Categoría:</label>
              <select
                id="view-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <div className="words-list-container">
                <p className="words-count">{wordsList.length} palabras</p>
                <div className="words-grid">
                  {wordsList.map((word, index) => (
                    <span key={index} className="word-chip">{word}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Eliminar palabras */}
          {activeTab === 'delete' && (
            <div className="tab-panel">
              <label htmlFor="delete-category">Categoría:</label>
              <select
                id="delete-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <p className="info-text">Selecciona las palabras que quieres eliminar (solo se eliminan palabras personalizadas):</p>
              
              <div className="words-list-container">
                <div className="words-grid">
                  {wordsList.map((word, index) => (
                    <button
                      key={index}
                      className={`word-chip selectable ${selectedWords.has(word) ? 'selected' : ''}`}
                      onClick={() => toggleWordSelection(word)}
                      aria-pressed={selectedWords.has(word)}
                    >
                      {word}
                      {selectedWords.has(word) && <span className="checkmark"> ✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                className="btn btn-danger" 
                onClick={handleDeleteWords}
                disabled={selectedWords.size === 0}
              >
                Eliminar Seleccionadas ({selectedWords.size})
              </button>
            </div>
          )}

          {/* Crear categoría */}
          {activeTab === 'createCategory' && (
            <div className="tab-panel">
              <label htmlFor="new-category-name">Nombre de la categoría:</label>
              <input
                id="new-category-name"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Deportes"
                className="category-input"
              />

              <label htmlFor="new-category-words">Palabras (separadas por comas, espacios o saltos de línea):</label>
              <textarea
                id="new-category-words"
                value={wordsInput}
                onChange={(e) => setWordsInput(e.target.value)}
                placeholder="FUTBOL, TENIS, NATACION..."
                className="words-textarea"
                rows="5"
              />

              <button className="btn btn-primary" onClick={handleCreateCategory}>
                Crear Categoría
              </button>
            </div>
          )}

          {/* Eliminar categoría */}
          {activeTab === 'deleteCategory' && (
            <div className="tab-panel">
              <label htmlFor="delete-cat-select">Categoría:</label>
              <select
                id="delete-cat-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <p className="warning-text">⚠️ Solo puedes eliminar categorías personalizadas. Las categorías por defecto no se pueden eliminar.</p>

              <button className="btn btn-danger" onClick={handleDeleteCategory}>
                Eliminar Categoría
              </button>
            </div>
          )}
        </div>

        {/* Mensaje de feedback */}
        {message && (
          <div className={`message ${messageType}`} role="alert">
            {message}
          </div>
        )}

        {/* Botón cerrar */}
        <button className="btn btn-secondary modal-close-btn" onClick={handleClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
