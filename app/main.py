from fastapi import FastAPI, Request, File, UploadFile
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

from .speech_processor import SpeechProcessor
from .lifx_controller import LifXController
from .command_parser import CommandParser

load_dotenv()

app = FastAPI(title="LifX Voice Control")
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialisation des composants
speech_processor = SpeechProcessor()
lifx_controller = LifXController()
command_parser = CommandParser()


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/process-voice")
async def process_voice(audio: UploadFile = File(...)):
    try:
        # Sauvegarder l'audio temporairement
        audio_path = f"temp_{audio.filename}"
        with open(audio_path, "wb") as f:
            f.write(await audio.read())

        # Transcription
        text = speech_processor.transcribe(audio_path)
        # Parser la commande
        command = command_parser.parse(text)

        # Exécuter sur la lampe
        result = lifx_controller.execute_command(command)

        # Nettoyer
        os.remove(audio_path)

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