"""
LÃ³gica del juego del ahorcado
"""
import random
import json
import os
from word_bank import WORD_BANK


class HangmanGame:
    def __init__(self):
        self.word = ""
        self.category = "Animales"
        self.difficulty = "Normal"  # FÃ¡cil, Normal, DifÃ­cil
        self.guessed_letters = set()
        self.max_attempts = 6
        self.attempts_left = 6
        self.game_over = False
        self.won = False
        self.last_message = ""  # Ãšltimo mensaje de retroalimentaciÃ³n
        self.custom_words_file = "custom_words.json"
        self.custom_words = self.load_custom_words()
        
    def load_custom_words(self):
        """Carga palabras personalizadas desde archivo JSON"""
        if os.path.exists(self.custom_words_file):
            try:
                with open(self.custom_words_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_custom_words(self):
        """Guarda palabras personalizadas en archivo JSON"""
        try:
            with open(self.custom_words_file, 'w', encoding='utf-8') as f:
                json.dump(self.custom_words, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            return False
    
    def get_all_words(self, category):
        """Obtiene todas las palabras de una categorÃ­a (incluidas + personalizadas)"""
        words = WORD_BANK.get(category, []).copy()
        if category in self.custom_words:
            words.extend(self.custom_words[category])
        return words
    
    def get_categories(self):
        """Obtiene lista de todas las categorÃ­as disponibles"""
        categories = set(WORD_BANK.keys())
        categories.update(self.custom_words.keys())
        return sorted(list(categories))
    
    def set_difficulty(self, difficulty):
        """Establece la dificultad del juego"""
        self.difficulty = difficulty
        if difficulty == "FÃ¡cil":
            self.max_attempts = 8
        elif difficulty == "Normal":
            self.max_attempts = 6
        elif difficulty == "DifÃ­cil":
            self.max_attempts = 4
        self.attempts_left = self.max_attempts
    
    def start_new_game(self, category=None):
        """Inicia una nueva partida"""
        if category:
            self.category = category
        
        words = self.get_all_words(self.category)
        if not words:
            return False, "No hay palabras en esta categorÃ­a"
        
        self.word = random.choice(words).upper()
        self.guessed_letters = set()
        self.attempts_left = self.max_attempts
        self.game_over = False
        self.won = False
        self.last_message = f"Nueva partida iniciada. Palabra de {len(self.word)} letras"
        
        return True, f"Nueva partida iniciada. CategorÃ­a: {self.category}. Palabra de {len(self.word)} letras"
    
    def get_display_word(self):
        """Obtiene la palabra con letras adivinadas y guiones"""
        return ' '.join([letter if letter in self.guessed_letters else '_' for letter in self.word])
    
    def get_display_word_for_speech(self):
        """Obtiene la palabra formateada para que NVDA la lea bien"""
        result = []
        for letter in self.word:
            if letter in self.guessed_letters:
                result.append(letter)
            else:
                result.append("guion bajo")
        return ', '.join(result)
    
    def guess_letter(self, letter):
        """Intenta adivinar una letra"""
        letter = letter.upper()
        
        if not letter.isalpha() or len(letter) != 1:
            msg = "Debes ingresar una sola letra"
            self.last_message = msg
            return False, msg
        
        if letter in self.guessed_letters:
            msg = f"Ya has usado la letra {letter}"
            self.last_message = msg
            return False, msg
        
        self.guessed_letters.add(letter)
        
        if letter in self.word:
            # Verificar si ganÃ³
            if all(l in self.guessed_letters for l in self.word):
                self.game_over = True
                self.won = True
                msg = f"Â¡Correcto! Has ganado. La palabra era: {self.word}"
                self.last_message = msg
                return True, msg
            
            count = self.word.count(letter)
            msg = f"Â¡Correcto! La letra {letter} estÃ¡ en la palabra ({count} {'vez' if count == 1 else 'veces'})"
            self.last_message = msg
            return True, msg
        else:
            self.attempts_left -= 1
            if self.attempts_left == 0:
                self.game_over = True
                self.won = False
                msg = f"Incorrecto. Has perdido. La palabra era: {self.word}"
                self.last_message = msg
                return False, msg
            
            msg = f"Incorrecto. La letra {letter} no estÃ¡. Te quedan {self.attempts_left} intentos"
            self.last_message = msg
            return False, msg
    
    def guess_word(self, word):
        """Intenta adivinar la palabra completa"""
        word = word.upper()
        
        if word == self.word:
            self.game_over = True
            self.won = True
            self.attempts_left = self.max_attempts
            msg = f"Â¡Correcto! Has ganado. La palabra era: {self.word}"
            self.last_message = msg
            return True, msg
        else:
            self.attempts_left -= 1
            if self.attempts_left == 0:
                self.game_over = True
                self.won = False
                msg = f"Incorrecto. Has perdido. La palabra era: {self.word}"
                self.last_message = msg
                return False, msg
            
            msg = f"Incorrecto. Esa no es la palabra. Te quedan {self.attempts_left} intentos"
            self.last_message = msg
            return False, msg
    
    def get_hint(self):
        """Obtiene una pista (revela una letra no adivinada)"""
        if self.attempts_left <= 1:
            msg = "No puedes pedir pistas con tan pocos intentos"
            self.last_message = msg
            return False, msg
        
        unguessed = [l for l in self.word if l not in self.guessed_letters]
        if not unguessed:
            msg = "Ya has adivinado todas las letras"
            self.last_message = msg
            return False, msg
        
        hint_letter = random.choice(unguessed)
        self.guessed_letters.add(hint_letter)
        self.attempts_left -= 1
        
        if all(l in self.guessed_letters for l in self.word):
            self.game_over = True
            self.won = True
            msg = f"Pista: La letra {hint_letter}. Â¡Has ganado! La palabra era: {self.word}"
            self.last_message = msg
            return True, msg
        
        msg = f"Pista: La letra {hint_letter} estÃ¡ en la palabra. Te quedan {self.attempts_left} intentos"
        self.last_message = msg
        return True, msg
    
    def get_game_state(self):
        """Obtiene el estado actual del juego"""
        state = ""
        
        # Mostrar Ãºltimo mensaje primero si existe
        if self.last_message:
            state += f">>> {self.last_message}\n\n"
        
        state += f"CategorÃ­a: {self.category}\n"
        state += f"Dificultad: {self.difficulty}\n"
        state += f"Palabra: {self.get_display_word()}\n"
        state += f"Intentos restantes: {self.attempts_left} de {self.max_attempts}\n"
        
        if self.guessed_letters:
            letters = sorted(list(self.guessed_letters))
            state += f"Letras usadas: {', '.join(letters)}\n"
        else:
            state += "Letras usadas: Ninguna\n"
        
        return state
    
    def add_custom_words(self, category, words_string):
        """AÃ±ade palabras personalizadas a una categorÃ­a"""
        # Separar por comas y limpiar
        words = [w.strip().upper() for w in words_string.split(',')]
        words = [w for w in words if w and w.isalpha()]
        
        if not words:
            return False, "No se encontraron palabras vÃ¡lidas"
        
        # Obtener palabras existentes
        existing = self.get_all_words(category)
        
        # Filtrar duplicados
        new_words = [w for w in words if w not in existing]
        
        if not new_words:
            return False, "Todas las palabras ya existen en esta categorÃ­a"
        
        # AÃ±adir a custom_words
        if category not in self.custom_words:
            self.custom_words[category] = []
        
        self.custom_words[category].extend(new_words)
        
        # Guardar
        if self.save_custom_words():
            total = len(self.get_all_words(category))
            return True, f"Se aÃ±adieron {len(new_words)} palabras a {category}. Total: {total} palabras"
        else:
            return False, "Error al guardar las palabras"
    
    def remove_word(self, category, word):
        """Elimina una palabra personalizada"""
        word = word.upper()
        
        if category not in self.custom_words:
            return False, "No hay palabras personalizadas en esta categorÃ­a"
        
        if word not in self.custom_words[category]:
            return False, "Esta palabra no estÃ¡ en las palabras personalizadas"
        
        self.custom_words[category].remove(word)
        
        # Si la categorÃ­a queda vacÃ­a, eliminarla
        if not self.custom_words[category]:
            del self.custom_words[category]
        
        if self.save_custom_words():
            return True, f"Palabra {word} eliminada de {category}"
        else:
            return False, "Error al guardar los cambios"
    
    def delete_category(self, category):
        """Elimina una categorÃ­a personalizada completa"""
        if category not in self.custom_words:
            return False, "Esta categorÃ­a no tiene palabras personalizadas"
        
        word_count = len(self.custom_words[category])
        del self.custom_words[category]
        
        if self.save_custom_words():
            return True, f"CategorÃ­a {category} eliminada ({word_count} palabras)"
        else:
            return False, "Error al guardar los cambios"
