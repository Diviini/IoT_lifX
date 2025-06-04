// ✅ Version corrigée et stabilisée du script JS avec gestion robuste des états

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isListening = false;
let isWakeRecognizing = false;
let isCommandRecognizing = false;
let currentStream;
let wakeWordRecognition;
let commandRecognition;
let listenToggleBtn;

const recordBtn = document.getElementById('recordBtn');
const status = document.getElementById('status');
const result = document.getElementById('result');

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkMicrophonePermission();
    createListenToggleButton();
    initializeWakeWordDetection();
    setTimeout(() => startWakeWordListening(), 1000);
});

function initializeEventListeners() {
    recordBtn.addEventListener('click', toggleRecording);
}

function createListenToggleButton() {
    listenToggleBtn = document.createElement('button');
    listenToggleBtn.innerHTML = '🛑 Arrêter l\'écoute H24';
    listenToggleBtn.className = 'listen-toggle-btn';
    listenToggleBtn.style.cssText = `margin-left: 10px; padding: 10px 15px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;`;
    recordBtn.parentNode.insertBefore(listenToggleBtn, recordBtn.nextSibling);
    listenToggleBtn.addEventListener('click', toggleWakeWordListening);
}

async function checkMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        recordBtn.style.opacity = '0.5';
        recordBtn.title = 'Microphone non accessible';
        listenToggleBtn.disabled = true;
        listenToggleBtn.innerHTML = '❌ Micro non accessible';
    }
}

function initializeWakeWordDetection() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        listenToggleBtn.disabled = true;
        listenToggleBtn.innerHTML = '❌ Pas de support SpeechRecognition';
        return;
    }

    wakeWordRecognition = new SR();
    wakeWordRecognition.continuous = true;
    wakeWordRecognition.interimResults = false;
    wakeWordRecognition.lang = 'fr-FR';

    wakeWordRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            console.log('🔍 Détection:', transcript);
            if (isWakeWordDetected(transcript)) {
                showStatus('🎯 "Ok lampe" détecté! Démarrage de l\'enregistrement...', 'success');
                wakeWordRecognition.stop();
                isWakeRecognizing = false;
                setTimeout(() => startCommandRecognition(), 500);
                break;
            }
        }
    };

    wakeWordRecognition.onerror = (e) => {
        console.error('Erreur wake word:', e.error);
        isWakeRecognizing = false;
        if (e.error !== 'not-allowed' && isListening) setTimeout(() => startWakeWordListening(), 1000);
    };

    wakeWordRecognition.onend = () => {
        isWakeRecognizing = false;
        if (isListening) setTimeout(() => startWakeWordListening(), 500);
    };
}

function isWakeWordDetected(text) {
    const wakeWords = ['ok lampe', 'okay lampe', 'ok lamp', 'hey lampe', 'ok lumière', 'ok éclairage'];
    return wakeWords.some(w => text.includes(w) || text.replace(/\s/g, '').includes(w.replace(/\s/g, '')));
}

function toggleWakeWordListening() {
    if (!isListening) startWakeWordListening();
    else stopWakeWordListening();
}

function startWakeWordListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!wakeWordRecognition || isWakeRecognizing || !SR) return;

    try {
        wakeWordRecognition.start();
        isWakeRecognizing = true;
        isListening = true;
        listenToggleBtn.innerHTML = '🛑 Arrêter l\'écoute H24';
        showStatus('👂 Dites "Ok lampe" pour commander', 'listening');
    } catch (e) {
        console.warn('Erreur démarrage wake:', e.message);
    }
}

function stopWakeWordListening() {
    if (wakeWordRecognition && isWakeRecognizing) wakeWordRecognition.stop();
    isListening = false;
    isWakeRecognizing = false;
    listenToggleBtn.innerHTML = '▶️ Relancer l\'écoute H24';
    showStatus('🔇 Écoute désactivée');
}

function startCommandRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || isCommandRecognizing) return;

    stopWakeWordListening();

    commandRecognition = new SR();
    commandRecognition.lang = 'fr-FR';
    commandRecognition.continuous = false;
    commandRecognition.interimResults = false;

    isCommandRecognizing = true;

    const timeout = setTimeout(() => {
        console.warn('⏰ Timeout 5s atteint, on stoppe...');
        commandRecognition.stop();
    }, 5000);

    commandRecognition.onresult = e => {
        clearTimeout(timeout);
        const text = e.results[0][0].transcript.trim();
        console.log('🎤 Commande reconnue:', text);
        sendTextToProcess(text);
    };

    commandRecognition.onerror = e => {
        console.error('Erreur reco commande:', e.error);
    };

    commandRecognition.onend = () => {
        isCommandRecognizing = false;
        startWakeWordListening();
    };

    try {
        commandRecognition.start();
    } catch (err) {
        console.error('Erreur démarrage commande:', err.message);
        isCommandRecognizing = false;
        startWakeWordListening();
    }
}

async function toggleRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startRecording(stream);
        } catch (err) {
            showStatus('❌ Erreur: Micro inaccessible', 'error');
        }
    } else {
        stopRecording();
    }
}

function startRecording(stream) {
    audioChunks = [];
    currentStream = stream;

    try {
        mediaRecorder = new MediaRecorder(stream);
    } catch (err) {
        showStatus('❌ MediaRecorder non supporté', 'error');
        return;
    }

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        processAudio(audioBlob, 'recording.webm');
        stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    recordBtn.classList.add('recording');
    recordBtn.textContent = '⏹️';
    showStatus('🎙️ Enregistrement en cours...');
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.textContent = '🎙️';
        showStatus('🔄 Traitement en cours...', 'loading');
    }
}

async function processAudio(audioBlob, filename) {
    showStatus('🔄 Envoi audio...', 'loading');

    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    try {
        const response = await fetch('/process-voice', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.status === 'success') {
            showStatus('✅ Commande exécutée!', 'success');
            showResult(data);
        } else {
            showStatus(`❌ Erreur: ${data.error}`, 'error');
        }
    } catch (e) {
        showStatus('❌ Erreur réseau: ' + e.message, 'error');
    }
}

function showStatus(message, type = '') {
    status.className = 'status';
    if (type) status.classList.add(type);
    status.innerHTML = message;
    console.log('Status:', message);
}

function showResult(data) {
    result.innerHTML = `
        <h3>📝 Transcription:</h3>
        <p><strong>${data.transcription}</strong></p>
        <h3>🧠 Commande parsée:</h3>
        <pre>${JSON.stringify(data.command, null, 2)}</pre>
        <h3>💡 Résultat:</h3>
        <pre>${JSON.stringify(data.result, null, 2)}</pre>`;
    result.classList.remove('hidden');
    result.scrollIntoView({ behavior: 'smooth' });
}

window.addEventListener('beforeunload', () => {
    stopWakeWordListening();
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
});
