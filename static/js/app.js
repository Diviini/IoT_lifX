// Variables globales
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isListening = false;
let wakeWordRecognition;
let commandRecognition;
let currentStream;

// Éléments DOM
const recordBtn = document.getElementById('recordBtn');
const status = document.getElementById('status');
const result = document.getElementById('result');

// Ajout d'un bouton pour activer/désactiver l'écoute en continu
let listenToggleBtn;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkMicrophonePermission();
    createListenToggleButton();
    initializeWakeWordDetection();

    // Démarrer automatiquement l'écoute H24
    setTimeout(() => {
        startWakeWordListening();
    }, 1000); // Délai pour laisser le temps aux permissions
});

function createListenToggleButton() {
    // Créer un bouton pour activer/désactiver l'écoute en continu
    listenToggleBtn = document.createElement('button');
    listenToggleBtn.innerHTML = '🛑 Arrêter l\'écoute H24';
    listenToggleBtn.className = 'listen-toggle-btn';
    listenToggleBtn.style.cssText = `
        margin-left: 10px;
        padding: 10px 15px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
    `;

    // Insérer le bouton à côté du bouton d'enregistrement
    recordBtn.parentNode.insertBefore(listenToggleBtn, recordBtn.nextSibling);

    listenToggleBtn.addEventListener('click', toggleWakeWordListening);
}

function initializeEventListeners() {
    // Enregistrement vocal
    recordBtn.addEventListener('click', toggleRecording);
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
        listenToggleBtn.style.opacity = '0.5';
        listenToggleBtn.disabled = true;
        listenToggleBtn.innerHTML = '❌ Micro non accessible';
    }
}

// === DÉTECTION MOT-CLÉ (WAKE WORD) ===
function initializeWakeWordDetection() {
    // Vérifier si l'API Speech Recognition est disponible
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('⚠️ Speech Recognition non supporté dans ce navigateur');
        listenToggleBtn.style.opacity = '0.5';
        listenToggleBtn.disabled = true;
        listenToggleBtn.innerHTML = '❌ Speech Recognition non supporté';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Configuration pour la détection du mot-clé
    wakeWordRecognition = new SpeechRecognition();
    wakeWordRecognition.continuous = true;
    wakeWordRecognition.interimResults = false;
    wakeWordRecognition.lang = 'fr-FR';

    wakeWordRecognition.onresult = function(event) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            console.log('🔍 Détection:', transcript);

            // Vérifier si le mot-clé est détecté
            if (isWakeWordDetected(transcript)) {
                console.log('🎯 Mot-clé détecté:', transcript);
                showStatus('🎯 "Ok lampe" détecté! Démarrage de l\'enregistrement...', 'success');

                // Arrêter temporairement l'écoute du mot-clé
                wakeWordRecognition.stop();

                // Démarrer l'enregistrement de commande
                setTimeout(() => {
                    startCommandRecording();
                }, 500);

                break;
            }
        }
    };

    wakeWordRecognition.onerror = function(event) {
        console.error('Erreur wake word recognition:', event.error);
        if (event.error === 'not-allowed') {
            showStatus('❌ Permission microphone refusée pour l\'écoute H24', 'error');
            stopWakeWordListening();
        } else {
            // Redémarrer automatiquement en cas d'autres erreurs
            setTimeout(() => {
                if (isListening) {
                    try {
                        wakeWordRecognition.start();
                    } catch (e) {
                        console.log('Tentative de redémarrage après erreur...');
                    }
                }
            }, 2000);
        }
    };

    wakeWordRecognition.onend = function() {
        if (isListening) {
            // Redémarrer automatiquement l'écoute si elle était active
            setTimeout(() => {
                try {
                    wakeWordRecognition.start();
                } catch (e) {
                    console.log('Redémarrage automatique de l\'écoute H24...');
                }
            }, 500);
        }
    };
}

function isWakeWordDetected(transcript) {
    const wakeWords = [
        'ok lampe',
        'okay lampe',
        'ok lamp',
        'lamp',
        'lampe',
        'hey lampe',
        'ok lumière',
        'ok éclairage'
    ];

    return wakeWords.some(wakeWord =>
        transcript.includes(wakeWord) ||
        transcript.replace(/\s/g, '').includes(wakeWord.replace(/\s/g, ''))
    );
}

function toggleWakeWordListening() {
    if (!isListening) {
        startWakeWordListening();
    } else {
        stopWakeWordListening();
    }
}

function startWakeWordListening() {
    if (!wakeWordRecognition) {
        showStatus('❌ Speech Recognition non disponible', 'error');
        return;
    }

    try {
        wakeWordRecognition.start();
        isListening = true;
        listenToggleBtn.innerHTML = '🛑 Arrêter l\'écoute H24';
        listenToggleBtn.style.background = '#f44336';
        showStatus('👂 Écoute H24 activée - Dites "Ok lampe" pour commander', 'listening');
        console.log('👂 Écoute H24 du mot-clé activée');
    } catch (err) {
        console.error('Erreur démarrage wake word:', err);
        if (err.name === 'InvalidStateError') {
            // Le recognition est déjà en cours, on l'arrête d'abord
            wakeWordRecognition.stop();
            setTimeout(() => startWakeWordListening(), 1000);
        }
    }
}

function stopWakeWordListening() {
    if (wakeWordRecognition) {
        wakeWordRecognition.stop();
    }
    isListening = false;
    listenToggleBtn.innerHTML = '👂 Réactiver l\'écoute H24';
    listenToggleBtn.style.background = '#2196F3';
    showStatus('🔇 Écoute H24 désactivée');
    console.log('🔇 Écoute H24 du mot-clé désactivée');
}

// === ENREGISTREMENT DE COMMANDE APRÈS MOT-CLÉ ===
async function startCommandRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentStream = stream;

        // Démarrer l'enregistrement automatiquement
        audioChunks = [];

        const options = { mimeType: 'audio/webm' };
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (err) {
            mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            processAudio(audioBlob, 'voice_command.webm');

            // Arrêter le stream
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
                currentStream = null;
            }

            // Redémarrer l'écoute du mot-clé après un délai
            setTimeout(() => {
                if (isListening) {
                    try {
                        wakeWordRecognition.start();
                        showStatus('👂 Écoute H24 réactivée - Dites "Ok lampe" pour commander', 'listening');
                    } catch (e) {
                        console.log('Redémarrage automatique de l\'écoute H24...');
                    }
                }
            }, 2000);
        };

        mediaRecorder.onerror = (event) => {
            console.error('Erreur MediaRecorder:', event);
            showStatus('❌ Erreur lors de l\'enregistrement', 'error');
        };

        mediaRecorder.start();
        showStatus('🎙️ Énoncez votre commande... (arrêt automatique dans 5s)', 'recording');

        // Arrêt automatique après 5 secondes
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }, 5000);

        console.log('🎙️ Enregistrement de commande démarré');

    } catch (err) {
        console.error('Erreur accès microphone pour commande:', err);
        showStatus('❌ Erreur microphone pour la commande', 'error');

        // Redémarrer l'écoute du mot-clé
        if (isListening) {
            setTimeout(() => {
                try {
                    wakeWordRecognition.start();
                } catch (e) {
                    console.log('Redémarrage de l\'écoute...');
                }
            }, 1000);
        }
    }
}

// === ENREGISTREMENT VOCAL MANUEL (bouton) ===
async function toggleRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startRecording(stream);
        } catch (err) {
            showStatus('❌ Erreur: Microphone non accessible.', 'error');
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
    } else if (type === 'listening') {
        status.innerHTML = `
            <span style="color: #2196F3; animation: pulse 2s infinite;">👂</span>
            <span style="margin-left: 10px;">${message}</span>
        `;
    } else if (type === 'recording') {
        status.innerHTML = `
            <span style="color: #f44336; animation: pulse 1s infinite;">🎙️</span>
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

// Nettoyer les ressources quand la page se ferme
window.addEventListener('beforeunload', function() {
    if (isListening) {
        stopWakeWordListening();
    }
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
});
