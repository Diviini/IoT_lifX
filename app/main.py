from fastapi import FastAPI, Request, File, UploadFile
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

from .speech_processor import SpeechProcessor
from .lifx_controller import LifXController
# from .wiz_controller import WizController
from .command_parser import CommandParser

load_dotenv()

app = FastAPI(title="LifX Voice Control")

# Configuration des templates et fichiers statiques
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialisation des composants
speech_processor = SpeechProcessor(model_size="base")
lifx_controller = LifXController()
command_parser = CommandParser()

# Modèle Pydantic pour recevoir du texte
class TextCommand(BaseModel):
    text: str
    brand: str  # "lifx" ou "wiz" (pour le futur)

wiz_controller = WizController()

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/process-text")
async def process_text(command: TextCommand):
    """Traite directement un texte depuis JavaScript (plus rapide que l'audio)"""
    try:
        text = command.text.strip()
        brand = command.brand.strip()
        print("Debug - Texte reçu:", text)
        print("Debug - Type de lampe:", brand)

        if not text:
            return JSONResponse({
                "error": "Texte vide",
                "status": "error"
            }, status_code=400)

        # Parser la commande
        parsed_command = command_parser.parse(text)
        print("Debug - Commande parsée:", parsed_command)

        # Détection de la lamp ( lifx ou wiz )
        if brand == "lifx":
            result = lifx_controller.execute_command(parsed_command)
        # else if type == "wiz":
        #     result = wiz_controller.execute_command(parsed_command)

        return JSONResponse({
            "transcription": text,
            "command": parsed_command,
            "result": result,
            "status": "success"
        })

    except Exception as e:
        print(f"Erreur process_text: {e}")
        return JSONResponse({
            "error": str(e),
            "status": "error"
        }, status_code=500)


@app.post("/process-voice")
async def process_voice(audio: UploadFile = File(...)):
    """Traite un fichier audio uploadé depuis le navigateur (fallback)"""
    try:
        # Lire le contenu du fichier
        audio_content = await audio.read()

        # Transcription
        text = speech_processor.transcribe_uploaded_file(audio_content, language="fr")
        print("Debug - Transcription:", text)

        if not text.strip():
            return JSONResponse({
                "error": "Aucun texte détecté dans l'audio",
                "status": "error"
            }, status_code=400)

        # Parser la commande
        command = command_parser.parse(text)
        print("Debug - Commande parsée:", command)

        # Exécuter sur la lampe
        result = lifx_controller.execute_command(command)

        return JSONResponse({
            "transcription": text,
            "command": command,
            "result": result,
            "status": "success"
        })

    except Exception as e:
        return JSONResponse({
            "error": str(e),
            "status": "error"
        }, status_code=500)


@app.post("/transcribe-only")
async def transcribe_only(audio: UploadFile = File(...)):
    """Transcrit seulement sans exécuter de commande"""
    try:
        audio_content = await audio.read()
        text = speech_processor.transcribe_uploaded_file(audio_content, language="fr")

        return JSONResponse({
            "transcription": text,
            "status": "success"
        })

    except Exception as e:
        return JSONResponse({
            "error": str(e),
            "status": "error"
        }, status_code=500)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "LifX Voice Control"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)