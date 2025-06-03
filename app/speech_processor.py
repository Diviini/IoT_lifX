import whisper
import os

class SpeechProcessor:
    def __init__(self):
        model_name = os.getenv('WHISPER_MODEL', 'base')
        self.model = whisper.load_model(model_name)

    def transcribe(self, audio_path):
        result = self.model.transcribe(audio_path, language='fr')
        return result['text'].strip()