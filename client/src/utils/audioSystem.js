/**
 * Sistema de audio usando Web Audio API
 * Genera tonos sintetizados con armónicos para feedback del juego
 */

// Importar archivos de audio
import applauseSound from '../assets/sounds/applause.mp3';
import booSound from '../assets/sounds/abucheo.mp3';

/**
 * Clase que gestiona la generación y reproducción de audio
 */
export class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.initialized = false;
    this.audioCache = {}; // Cache para archivos de audio precargados (crítico para iOS)
  }

  /**
   * Inicializa el contexto de audio
   * Debe llamarse después de una interacción del usuario (requisito del navegador)
   * @returns {boolean} True si se inicializó correctamente
   */
  initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      // Crear contexto de audio
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      
      if (!AudioContext) {
        console.warn('Web Audio API no está disponible en este navegador');
        this.enabled = false;
        return false;
      }

      this.audioContext = new AudioContext();
      
      // Precargar archivos de audio (crítico para iOS/Safari)
      this.preloadAudioFiles();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error al inicializar Web Audio API:', error);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Precarga archivos de audio en el cache
   * Esto es especialmente importante para iOS/Safari donde los archivos
   * deben ser cargados después de una interacción del usuario
   */
  preloadAudioFiles() {
    try {
      console.log('Precargando archivos de audio...');
      
      // Precargar archivo de aplausos
      const applauseAudio = new Audio(applauseSound);
      applauseAudio.load();
      this.audioCache['applause'] = applauseAudio;
      
      // Precargar archivo de abucheo
      const booAudio = new Audio(booSound);
      booAudio.load();
      this.audioCache['boo'] = booAudio;
      
      console.log('Archivos de audio precargados correctamente');
    } catch (error) {
      console.error('Error al precargar archivos de audio:', error);
    }
  }

  /**
   * Genera un tono con armónicos para audio más rico
   * @param {number} frequency - Frecuencia fundamental en Hz
   * @param {number} duration - Duración en segundos
   * @param {number} volume - Volumen (0.0 a 1.0)
   * @returns {Promise<void>}
   */
  async generateTone(frequency, duration, volume = 0.3) {
    if (!this.enabled) {
      return;
    }

    // Inicializar si es necesario
    if (!this.initialized) {
      const success = this.initialize();
      if (!success) {
        return;
      }
    }

    try {
      const currentTime = this.audioContext.currentTime;
      
      // Crear ganancia principal
      const gainNode = this.audioContext.createGain();
      gainNode.connect(this.audioContext.destination);
      
      // Configurar envolvente ADSR (Attack, Decay, Sustain, Release)
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.01); // Attack
      gainNode.gain.linearRampToValueAtTime(volume * 0.7, currentTime + 0.05); // Decay
      gainNode.gain.setValueAtTime(volume * 0.7, currentTime + duration - 0.05); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration); // Release

      // Crear osciladores con armónicos para sonido más rico
      const oscillators = [];
      
      // Fundamental
      const osc1 = this.audioContext.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(frequency, currentTime);
      
      const gain1 = this.audioContext.createGain();
      gain1.gain.setValueAtTime(1.0, currentTime);
      osc1.connect(gain1);
      gain1.connect(gainNode);
      oscillators.push(osc1);

      // Segundo armónico (octava)
      const osc2 = this.audioContext.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(frequency * 2, currentTime);
      
      const gain2 = this.audioContext.createGain();
      gain2.gain.setValueAtTime(0.3, currentTime);
      osc2.connect(gain2);
      gain2.connect(gainNode);
      oscillators.push(osc2);

      // Tercer armónico (quinta)
      const osc3 = this.audioContext.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(frequency * 3, currentTime);
      
      const gain3 = this.audioContext.createGain();
      gain3.gain.setValueAtTime(0.15, currentTime);
      osc3.connect(gain3);
      gain3.connect(gainNode);
      oscillators.push(osc3);

      // Iniciar todos los osciladores
      oscillators.forEach(osc => {
        osc.start(currentTime);
        osc.stop(currentTime + duration);
      });

      // Esperar a que termine el sonido
      await new Promise(resolve => setTimeout(resolve, duration * 1000));
    } catch (error) {
      console.error('Error al generar tono:', error);
    }
  }

  /**
   * Genera una melodía con múltiples notas
   * @param {number[]} frequencies - Array de frecuencias en Hz
   * @param {number} noteDuration - Duración de cada nota en segundos
   * @param {number} volume - Volumen (0.0 a 1.0)
   * @returns {Promise<void>}
   */
  async generateMelody(frequencies, noteDuration = 0.2, volume = 0.3) {
    if (!this.enabled) {
      return;
    }

    for (const frequency of frequencies) {
      await this.generateTone(frequency, noteDuration, volume);
      // Pequeña pausa entre notas
      await new Promise(resolve => setTimeout(resolve, noteDuration * 100));
    }
  }

  /**
   * Reproduce sonido de letra correcta (tono ascendente)
   * @returns {Promise<void>}
   */
  async playCorrectSound() {
    // Tono ascendente agradable (Do - Mi - Sol)
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    await this.generateMelody(frequencies, 0.15, 0.25);
  }

  /**
   * Reproduce sonido de letra incorrecta (tono descendente)
   * @returns {Promise<void>}
   */
  async playIncorrectSound() {
    // Tono descendente de error (Sol - Mi - Do)
    const frequencies = [392.00, 329.63, 261.63]; // G4, E4, C4
    await this.generateMelody(frequencies, 0.15, 0.25);
  }

  /**
   * Reproduce un archivo de audio
   * @param {string} audioPath - Ruta al archivo de audio
   * @param {number} volume - Volumen (0.0 a 1.0)
   * @returns {Promise<void>}
   */
  async playAudioFile(audioPath, volume = 0.5) {
    if (!this.enabled) {
      console.log('Audio deshabilitado');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        
        // Configurar eventos ANTES de establecer src
        audio.oncanplaythrough = () => {
          console.log('Audio cargado y listo para reproducir');
        };
        
        audio.onended = () => {
          console.log('Audio terminó de reproducirse');
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('Error en elemento audio:', error);
          reject(new Error('Error al cargar audio'));
        };
        
        // Configurar audio
        audio.volume = volume;
        audio.preload = 'auto';
        audio.src = audioPath;
        
        // Intentar reproducir
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Reproducción iniciada exitosamente');
            })
            .catch((error) => {
              console.error('Error al iniciar reproducción:', error.name, error.message);
              // En iOS, si falla por política de autoplay, rechazar
              reject(error);
            });
        } else {
          // Navegadores antiguos que no devuelven Promise
          console.log('Reproducción iniciada (navegador antiguo)');
        }
      } catch (error) {
        console.error('Error al crear elemento Audio:', error);
        reject(error);
      }
    });
  }

  /**
   * Reproduce sonido de victoria en una ronda (melodía corta alegre)
   * @returns {Promise<void>}
   */
  async playRoundWinSound() {
    // Melodía corta ascendente alegre (Do - Mi - Sol)
    const frequencies = [
      523.25, // C5
      659.25, // E5
      783.99  // G5
    ];
    await this.generateMelody(frequencies, 0.2, 0.3);
  }

  /**
   * Reproduce sonido de derrota en una ronda (melodía corta triste)
   * @returns {Promise<void>}
   */
  async playRoundLoseSound() {
    // Melodía corta descendente triste (Sol - Mi - Do)
    const frequencies = [
      783.99, // G5
      659.25, // E5
      523.25  // C5
    ];
    await this.generateMelody(frequencies, 0.25, 0.3);
  }

  /**
   * Reproduce sonido de victoria de la partida completa (aplausos)
   * @returns {Promise<void>}
   */
  async playMatchWinSound() {
    // Intentar reproducir archivo de aplausos desde el cache
    try {
      console.log('Intentando reproducir aplausos...');
      
      if (this.audioCache['applause']) {
        // Usar el audio precargado (mejor para iOS)
        const audio = this.audioCache['applause'];
        audio.currentTime = 0; // Reiniciar al inicio
        
        return new Promise((resolve, reject) => {
          audio.onended = () => {
            console.log('Aplausos reproducidos exitosamente');
            resolve();
          };
          
          audio.onerror = (error) => {
            console.error('Error en reproducción de aplausos:', error);
            reject(error);
          };
          
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Reproducción de aplausos iniciada');
              })
              .catch((error) => {
                console.error('Error al iniciar aplausos:', error);
                reject(error);
              });
          }
        });
      } else {
        // Si no hay cache, intentar cargar directamente
        await this.playAudioFile(applauseSound, 0.6);
      }
      
      console.log('Aplausos reproducidos exitosamente');
    } catch (error) {
      // Si falla, usar melodía sintetizada como fallback
      console.warn('Error al reproducir aplausos, usando fallback:', error);
      const frequencies = [
        523.25, // C5
        659.25, // E5
        783.99, // G5
        1046.50 // C6
      ];
      await this.generateMelody(frequencies, 0.2, 0.3);
    }
  }

  /**
   * Reproduce sonido de derrota de la partida completa (abucheo)
   * @returns {Promise<void>}
   */
  async playMatchLoseSound() {
    // Intentar reproducir archivo de abucheo desde el cache
    try {
      console.log('Intentando reproducir abucheo...');
      
      if (this.audioCache['boo']) {
        // Usar el audio precargado (mejor para iOS)
        const audio = this.audioCache['boo'];
        audio.currentTime = 0; // Reiniciar al inicio
        
        return new Promise((resolve, reject) => {
          audio.onended = () => {
            console.log('Abucheo reproducido exitosamente');
            resolve();
          };
          
          audio.onerror = (error) => {
            console.error('Error en reproducción de abucheo:', error);
            reject(error);
          };
          
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Reproducción de abucheo iniciada');
              })
              .catch((error) => {
                console.error('Error al iniciar abucheo:', error);
                reject(error);
              });
          }
        });
      } else {
        // Si no hay cache, intentar cargar directamente
        await this.playAudioFile(booSound, 0.6);
      }
      
      console.log('Abucheo reproducido exitosamente');
    } catch (error) {
      // Si falla, usar melodía sintetizada como fallback
      console.warn('Error al reproducir abucheo, usando fallback:', error);
      const frequencies = [
        523.25, // C5
        440.00, // A4
        349.23, // F4
        293.66  // D4
      ];
      await this.generateMelody(frequencies, 0.25, 0.3);
    }
  }

  /**
   * Reproduce sonido de victoria (para modo individual - mantener compatibilidad)
   * @returns {Promise<void>}
   */
  async playWinSound() {
    await this.playMatchWinSound();
  }

  /**
   * Reproduce sonido de derrota (para modo individual - mantener compatibilidad)
   * @returns {Promise<void>}
   */
  async playLoseSound() {
    await this.playRoundLoseSound();
  }

  /**
   * Habilita o deshabilita el audio
   * @param {boolean} enabled - True para habilitar, false para deshabilitar
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Verifica si el audio está habilitado
   * @returns {boolean} True si está habilitado
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Cierra el contexto de audio y libera recursos
   */
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      this.initialized = false;
    }
  }
}

// Exportar instancia singleton
export const audioSystem = new AudioSystem();
