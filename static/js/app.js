// Variables globales
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Éléments DOM
const recordBtn = document.getElementById('recordBtn');
const uploadArea = document.getElementById('uploadArea');
const audioFile = document.getElementById('audioFile');
const status = document.getElementById('status');
const result = document.getElementById('result');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkMicrophonePermission();
});

function initializeEventListeners() {
    // Enregistrement vocal
    recordBtn.addEventListener('click', toggleRecording);

    // Upload de fichier
    uploadArea.addEventListener('click', () => audioFile.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    audioFile.addEventListener('change', handleFileSelect);
}

async function checkMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Microphone accessible');
    } catch (err) {
        console.warn('⚠️ Microphone non accessible:', err);
        recordBtn.style.opacity = '0.5';
        recordBtn.title = 'Microphone non accessible - Utilisez l\'upload de fichier';
    }
}

// === ENREGISTREMENT VOCAL ===
async function toggleRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startRecording(stream);
        } catch (err) {
            showStatus('❌ Erreur: Microphone non accessible. Utilisez l\'upload de fichier.', 'error');
            console.error('Erreur microphone:', err);
        }
    } else {
        stopRecording();
    }
}

function startRecording(stream) {
    audioChunks = [];

    // Configuration du MediaRecorder
    const options = { mimeType: 'audio/webm' };
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (err) {
        // Fallback si webm n'est pas supporté
        mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        processAudio(audioBlob, 'recording.webm');

        // Arrêter tous les tracks audio
        stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.onerror = (event) => {
        console.error('Erreur MediaRecorder:', event);
        showStatus('❌ Erreur lors de l\'enregistrement', 'error');
        resetRecordingState();
    };

    mediaRecorder.start();
    isRecording = true;
    recordBtn.classList.add('recording');
    recordBtn.textContent = '⏹️';
    showStatus('🎙️ Enregistrement en cours... Cliquez à nouveau pour arrêter');

    console.log('🎙️ Enregistrement démarré');
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        resetRecordingState();
        showStatus('🔄 Traitement en cours...', 'loading');
        console.log('⏹️ Enregistrement arrêté');
    }
}

function resetRecordingState() {
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '🎙️';
}

// === UPLOAD DE FICHIER ===
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
            processAudio(file, file.name);
        } else {
            showStatus('❌ Veuillez sélectionner un fichier audio', 'error');
        }
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        processAudio(file, file.name);
    }
}

// === TRAITEMENT AUDIO ===
async function processAudio(audioBlob, filename) {
    showStatus('🔄 Transcription et exécution de la commande...', 'loading');

    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    try {
        const response = await fetch('/process-voice', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('✅ Commande exécutée avec succès!', 'success');
            showResult(data);
        } else {
            showStatus(`❌ Erreur: ${data.error}`, 'error');
            console.error('Erreur serveur:', data);
        }
    } catch (error) {
        showStatus(`❌ Erreur de connexion: ${error.message}`, 'error');
        console.error('Erreur réseau:', error);
    }

    // Reset file input
    audioFile.value = '';
}

// === AFFICHAGE ===
function showStatus(message, type = '') {
    status.className = 'status';
    if (type) {
        status.classList.add(type);
    }

    if (type === 'loading') {
        status.innerHTML = `
            <div class="loader"></div>
            <span style="margin-left: 10px;">${message}</span>
        `;
    } else {
        status.innerHTML = message;
    }

    console.log('Status:', message);
}

function showResult(data) {
    const resultHTML = `
        <h3>📝 Transcription:</h3>
        <p style="font-size: 1.2em; margin-bottom: 15px; font-weight: bold; color: #4CAF50;">
            "${data.transcription}"
        </p>

        <h3>🧠 Commande parsée:</h3>
        <pre>${JSON.stringify(data.command, null, 2)}</pre>

        <h3>💡 Résultat LifX:</h3>
        <pre>${JSON.stringify(data.result, null, 2)}</pre>
    `;

    result.innerHTML = resultHTML;
    result.classList.remove('hidden');

    // Scroll vers les résultats
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// === GESTION D'ERREURS GLOBALES ===
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e);
    showStatus('❌ Une erreur inattendue s\'est produite', 'error');
});

// === UTILITAIRES ===
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}