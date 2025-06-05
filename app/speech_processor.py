import whisper
import sounddevice as sd
from faster_whisper import WhisperModel
import numpy as np
import os
import tempfile
from typing import Optional


class SpeechProcessor:
    def __init__(self, model_size: str = "tiny"):
        """
        Initialise le processeur de reconnaissance vocale

        Args:
            model_size: Taille du modèle Whisper ("tiny", "base", "small", "medium", "large")
        """
        print(f"🤖 Chargement du modèle Whisper '{model_size}'...")
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

        print("✅ Modèle chargé avec succès")

    def transcribe(self, audio_path: str) -> str:
        """
        Transcrit un fichier audio en texte

        Args:
            audio_path: Chemin vers le fichier audio
            language: Langue de transcription ("fr", "en", etc.)

        Returns:
            Texte transcrit
        """
        try:
            print(f"🧠 Transcription de {audio_path}...")
            segments, _ = self.model.transcribe(audio_path)
            transcribed_text = " ".join([segment.text for segment in segments])
            print("✅ Transcription terminée : ", transcribed_text)
            return transcribed_text
        except Exception as e:
            print(f"❌ Erreur lors de la transcription: {e}")
            raise Exception(f"Erreur de transcription: {str(e)}")

    def record_and_transcribe(self, duration: int = 5, fs: int = 44100) -> str:
        """
        Enregistre l'audio depuis le microphone et le transcrit

        Args:
            duration: Durée d'enregistrement en secondes
            fs: Fréquence d'échantillonnage
            language: Langue de transcription

        Returns:
            Texte transcrit
        """
        # Créer un fichier temporaire
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_filename = temp_file.name

        try:
            # Enregistrement
            print("🎙️ Enregistrement en cours...")
            recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
            sd.wait()
            print("✅ Enregistrement terminé")

            # Sauvegarde temporaire en numpy puis conversion en WAV
            temp_npy = temp_filename.replace('.wav', '.npy')
            np.save(temp_npy, recording)

            # Conversion en WAV avec ffmpeg
            os.system(f"ffmpeg -y -f f32le -ar {fs} -ac 1 -i {temp_npy} {temp_filename} -loglevel quiet")
            os.remove(temp_npy)

            # Transcription
            result = self.transcribe(temp_filename)

            return result

        finally:
            # Nettoyage du fichier temporaire
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

    def transcribe_uploaded_file(self, file_content: bytes) -> str:
        """
        Transcrit un fichier audio uploadé

        Args:
            file_content: Contenu du fichier audio en bytes
            language: Langue de transcription

        Returns:
            Texte transcrit
        """
        # Créer un fichier temporaire
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(file_content)
            temp_filename = temp_file.name

        try:
            result = self.transcribe(temp_filename)
            return result
        finally:
            # Nettoyage
            if os.path.exists(temp_filename):
                os.remove(temp_filename)