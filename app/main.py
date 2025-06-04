from fastapi import FastAPI, Request, File, UploadFile
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from .speech_processor import SpeechProcessor
from .lifx_controller import LifXController
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


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/process-text")
async def process_text(command: TextCommand):
    """Traite directement un texte depuis JavaScript (plus rapide que l'audio)"""
    try:
        text = command.text.strip()
        print("Debug - Texte reçu:", text)

        if not text:
            return JSONResponse({
                "error": "Texte vide",
                "status": "error"
            }, status_code=400)

        # Parser la commande
        parsed_command = command_parser.parse(text)
        print("Debug - Commande parsée:", parsed_command)

        # Exécuter sur la lampe
        result = lifx_controller.execute_command(parsed_command)

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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "LifX Voice Control"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)