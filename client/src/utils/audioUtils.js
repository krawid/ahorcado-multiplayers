/**
 * Sistema de audio para el juego del ahorcado
 * Genera sonidos sintéticos usando Web Audio API
 */

class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.soundsCache = {};
    this.enabled = true;
    
    // Inicializar Audio Context
    this.initAudioContext();
  }

  /**
   * Inicializa el contexto de audio
   */
  initAudioContext() {
    try {
      // Crear Audio Context (compatible con navegadores)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      } else {
        console.warn('Web Audio API no disponible');
        this.enabled = false;
      }
    } catch (e) {
      console.error('Error al inicializar Audio Context:', e);
      this.enabled = false;
    }
  }

  /**
   * Resume el contexto de audio (necesario en algunos navegadores)
   */
  async resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.error('Error al resumir Audio Context:', e);
      }
    }
  }

  /**
   * Genera un tono con armónicos para sonido más rico
   * @param {number} frequency - Frecuencia en Hz
   * @param {number} duration - Duración en segundos
   * @returns {AudioBuffer}
   */
  generateTone(frequency, duration) {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const samples = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(2, samples, sampleRate);
    
    // Generar onda con armónicos
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        
        // Onda fundamental + armónicos
        let sample = Math.sin(2 * Math.PI * frequency * t);           // Fundamental
        sample += 0.3 * Math.sin(2 * Math.PI * frequency * 2 * t);    // 2º armónico
        sample += 0.15 * Math.sin(2 * Math.PI * frequency * 3 * t);   // 3º armónico
        sample /= 1.45; // Normalizar
        
        // Aplicar fade in/out para evitar clicks
        const fadeSamples = Math.floor(sampleRate * 0.02);
        if (i < fadeSamples) {
          sample *= i / fadeSamples;
        } else if (i > samples - fadeSamples) {
          sample *= (samples - i) / fadeSamples;
        }
        
        channelData[i] = sample * 0.7; // Volumen
      }
    }
    
    return buffer;
  }

  /**
   * Genera una melodía con varias notas
   * @param {number[]} frequencies - Array de frecuencias en Hz
   * @param {number} noteDuration - Duración de cada nota en segundos
   * @returns {AudioBuffer}
   */
  generateMelody(frequencies, noteDuration) {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const samplesPerNote = Math.floor(sampleRate * noteDuration);
    const totalSamples = samplesPerNote * frequencies.length;
    const buffer = this.audioContext.createBuffer(2, totalSamples, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      frequencies.forEach((freq, noteIndex) => {
        const startSample = noteIndex * samplesPerNote;
        
        for (let i = 0; i < samplesPerNote; i++) {
          const t = i / sampleRate;
          
          // Nota con armónicos
          let sample = Math.sin(2 * Math.PI * freq * t);
          sample += 0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
          sample += 0.15 * Math.sin(2 * Math.PI * freq * 3 * t);
          sample /= 1.45;
          
          // Fade in/out para cada nota
          const fadeSamples = Math.floor(sampleRate * 0.02);
          if (i < fadeSamples) {
            sample *= i / fadeSamples;
          } else if (i > samplesPerNote - fadeSamples) {
            sample *= (samplesPerNote - i) / fadeSamples;
          }
          
          channelData[startSample + i] = sample * 0.7;
        }
      });
    }
    
    return buffer;
  }

  /**
   * Reproduce un buffer de audio
   * @param {AudioBuffer} buffer - Buffer a reproducir
   */
  async playBuffer(buffer) {
    if (!this.audioContext || !buffer || !this.enabled) return;

    try {
      // Resume context si está suspendido
      await this.resumeContext();
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (e) {
      console.error('Error al reproducir sonido:', e);
    }
  }

  /**
   * Genera y cachea los sonidos del juego
   */
  generateGameSounds() {
    if (!this.audioContext) return;

    try {
      // Sonido correcto (acorde mayor ascendente: Do5-Mi5)
      this.soundsCache.correct = this.generateMelody([523, 659], 0.12);
      
      // Sonido incorrecto (acorde menor descendente: Sol4-Mib4)
      this.soundsCache.incorrect = this.generateMelody([392, 311], 0.15);
      
      // Sonido ganar (melodía triunfal: Do5-Mi5-Sol5-Do6)
      this.soundsCache.win = this.generateMelody([523, 659, 784, 1047], 0.18);
      
      // Sonido perder (melodía triste: Do5-Sib4-Sol4-Mib4)
      this.soundsCache.lose = this.generateMelody([523, 466, 392, 311], 0.18);
    } catch (e) {
      console.error('Error al generar sonidos:', e);
      this.enabled = false;
    }
  }

  /**
   * Reproduce sonido de letra correcta
   */
  async playCorrectSound() {
    if (!this.soundsCache.correct) {
      this.generateGameSounds();
    }
    await this.playBuffer(this.soundsCache.correct);
  }

  /**
   * Reproduce sonido de letra incorrecta
   */
  async playIncorrectSound() {
    if (!this.soundsCache.incorrect) {
      this.generateGameSounds();
    }
    await this.playBuffer(this.soundsCache.incorrect);
  }

  /**
   * Reproduce sonido de victoria
   */
  async playWinSound() {
    if (!this.soundsCache.win) {
      this.generateGameSounds();
    }
    await this.playBuffer(this.soundsCache.win);
  }

  /**
   * Reproduce sonido de derrota
   */
  async playLoseSound() {
    if (!this.soundsCache.lose) {
      this.generateGameSounds();
    }
    await this.playBuffer(this.soundsCache.lose);
  }

  /**
   * Habilita o deshabilita el audio
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Verifica si el audio está disponible
   */
  isAvailable() {
    return this.audioContext !== null;
  }

  /**
   * Limpia recursos
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.soundsCache = {};
  }
}

// Instancia singleton
let audioSystemInstance = null;

/**
 * Obtiene la instancia del sistema de audio
 */
export function getAudioSystem() {
  if (!audioSystemInstance) {
    audioSystemInstance = new AudioSystem();
  }
  return audioSystemInstance;
}

/**
 * Funciones de conveniencia para usar directamente
 */
export async function playCorrectSound() {
  const audio = getAudioSystem();
  await audio.playCorrectSound();
}

export async function playIncorrectSound() {
  const audio = getAudioSystem();
  await audio.playIncorrectSound();
}

export async function playWinSound() {
  const audio = getAudioSystem();
  await audio.playWinSound();
}

export async function playLoseSound() {
  const audio = getAudioSystem();
  await audio.playLoseSound();
}

export function setAudioEnabled(enabled) {
  const audio = getAudioSystem();
  audio.setEnabled(enabled);
}

export function isAudioAvailable() {
  const audio = getAudioSystem();
  return audio.isAvailable();
}

export default AudioSystem;
