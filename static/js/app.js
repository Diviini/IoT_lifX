// Variables globales
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isListening = false;
let speechRecognition;
let currentStream;
let isWaitingForCommand = false; // Boolean pour le mode commande
let selectedBrand = "lifx"; // Marque sélectionnée par défaut

// Éléments DOM
const recordBtn = document.getElementById('recordBtn');
const recordingText = document.getElementById('recordingText');
const status = document.getElementById('status');
const result = document.getElementById('result');
const lifxBtn = document.getElementById('lifxBtn');
const wizBtn = document.getElementById('wizBtn');

// Ajout d'un bouton pour activer/désactiver l'écoute en continu
let listenToggleBtn;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkMicrophonePermission();
    createListenToggleButton();
    initializeSpeechRecognition();

    // Démarrer automatiquement l'écoute H24
    setTimeout(() => {
        startListening();
    }, 1000); // Délai pour laisser le temps aux permissions
});

// Gestion de la sélection de marque
lifxBtn.addEventListener('click', () => selectBrandFunction('lifx'));
wizBtn.addEventListener('click', () => selectBrandFunction('wiz'));

function updateStatus(message, type = '') {
    status.textContent = message;
    status.className = 'status';
    if (type) {
        status.classList.add(type);
    }
}

// Initialisation
updateStatus('Choisissez votre marque d\'ampoule connectée');


function selectBrandFunction(brand) {
    selectedBrand = brand;

    // Mise à jour de l'interface
    lifxBtn.classList.remove('active');
    wizBtn.classList.remove('active');

    if (brand === 'lifx') {
        lifxBtn.classList.add('active');
        updateStatus(`LifX sélectionné - Prêt à recevoir vos commandes vocales`);
        recordingText.textContent = 'Cliquez pour enregistrer une commande LifX';
    } else if (brand === 'wiz') {
        wizBtn.classList.add('active');
        updateStatus(`Wiz sélectionné - Prêt à recevoir vos commandes vocales`);
        recordingText.textContent = 'Cliquez pour enregistrer une commande Wiz';
    }

    // Activer le bouton d'enregistrement
    recordBtn.disabled = false;
}



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

    listenToggleBtn.addEventListener('click', toggleListening);
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
        listenTogileBtn.disabled = true;
        listenToggleBtn.innerHTML = '❌ Micro non accessible';
    }
}

// === RECONNAISSANCE VOCALE UNIFIÉE ===
function initializeSpeechRecognition() {
    // Vérifier si l'API Speech Recognition est disponible
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('⚠️ Speech Recognition non supporté dans ce navigateur');
        listenToggleBtn.style.opacity = '0.5';
        listenToggleBtn.disabled = true;
        listenToggleBtn.innerHTML = '❌ Speech Recognition non supporté';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Un seul objet Speech Recognition pour tout
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'fr-FR';

    speechRecognition.onresult = function(event) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            console.log('🔍 Détection:', transcript);

            if (isWaitingForCommand) {
                // Mode commande : traiter tout ce qui est dit
                console.log('📝 Commande reçue:', transcript);
                handleCommand(transcript);
                return;
            } else {
                // Mode wake word : chercher "ok lampe"
                if (isWakeWordDetected(transcript)) {
                    console.log('🎯 Mot-clé détecté:', transcript);
                    showStatus('🎯 "Ok lampe" détecté! Énoncez votre commande...', 'success');

                    // Passer en mode commande
                    isWaitingForCommand = true;

                    // Timeout automatique après 5 secondes
                    setTimeout(() => {
                        if (isWaitingForCommand) {
                            console.log('⏰ Timeout commande - retour au mode écoute');
                            isWaitingForCommand = false;
                            if (isListening) {
                                showStatus('👂 Écoute H24 réactivée - Dites "Ok lampe" pour commander', 'listening');
                            }
                        }
                    }, 5000);
                }
            }
        }
    };

    speechRecognition.onerror = function(event) {
        console.error('Erreur speech recognition:', event.error);

        let errorMessage = 'Erreur de reconnaissance vocale';

        switch(event.error) {
            case 'no-speech':
                console.log('⚠️ Aucune parole détectée');
                return; // Pas d'erreur, c'est normal
            case 'audio-capture':
                errorMessage = 'Erreur de capture audio';
                break;
            case 'not-allowed':
                errorMessage = 'Permission microphone refusée';
                stopListening();
                break;
            case 'network':
                errorMessage = 'Erreur réseau pour la reconnaissance vocale';
                break;
            case 'aborted':
                console.log('🔇 Reconnaissance vocale interrompue');
                return; // Pas d'erreur à afficher
            default:
                errorMessage = `Erreur: ${event.error}`;
        }

        showStatus(`❌ ${errorMessage}`, 'error');

        // Redémarrage automatique sauf si c'est une erreur de permission
        if (event.error !== 'not-allowed' && isListening) {
            setTimeout(() => {
                restartListening();
            }, 2000);
        }
    };

    speechRecognition.onend = function() {
        console.log('🔚 Speech recognition terminée');

        if (isListening) {
            // Redémarrage automatique
            setTimeout(() => {
                restartListening();
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
        'ok éclairage',
        'ok lupo',
        'ok lupin',
        'oki doki',
        'luigi twerk',
        'salut',
        'bonjour'
    ];

    return wakeWords.some(wakeWord =>
        transcript.includes(wakeWord) ||
        transcript.replace(/\s/g, '').includes(wakeWord.replace(/\s/g, ''))
    );
}

function handleCommand(commandText) {
    // Sortir du mode commande
    isWaitingForCommand = false;

    // Traiter la commande
    processTextCommand(commandText);
}

function toggleListening() {
    if (!isListening) {
        startListening();
    } else {
        stopListening();
    }
}

function startListening() {
    if (!speechRecognition) {
        showStatus('❌ Speech Recognition non disponible', 'error');
        return;
    }

    try {
        speechRecognition.start();
        isListening = true;
        isWaitingForCommand = false;
        listenToggleBtn.innerHTML = '🛑 Arrêter l\'écoute H24';
        listenToggleBtn.style.background = '#f44336';
        showStatus('👂 Écoute H24 activée - Dites "Ok lampe" pour commander', 'listening');
        console.log('👂 Écoute H24 activée');
    } catch (err) {
        console.error('Erreur démarrage speech recognition:', err);
        if (err.name === 'InvalidStateError') {
            // Déjà en cours, on arrête d'abord
            speechRecognition.stop();
            setTimeout(() => startListening(), 1000);
        }
    }
}

function stopListening() {
    if (speechRecognition) {
        speechRecognition.stop();
    }
    isListening = false;
    isWaitingForCommand = false;
    listenToggleBtn.innerHTML = '👂 Réactiver l\'écoute H24';
    listenToggleBtn.style.background = '#2196F3';
    showStatus('🔇 Écoute H24 désactivée');
    console.log('🔇 Écoute H24 désactivée');
}

function restartListening() {
    if (!isListening) return;

    try {
        speechRecognition.start();
        console.log('🔄 Speech recognition redémarrée');
        if (!isWaitingForCommand) {
            showStatus('👂 Écoute H24 réactivée - Dites "Ok lampe" pour commander', 'listening');
        }
    } catch (err) {
        console.error('Erreur redémarrage:', err);
        if (err.name === 'InvalidStateError') {
            // Déjà en cours, pas de problème
            console.log('Speech recognition déjà active');
        } else {
            // Réessayer plus tard
            setTimeout(() => restartListening(), 2000);
        }
    }
}

// === TRAITEMENT COMMANDE TEXTE ===
async function processTextCommand(text) {
    showStatus('🔄 Traitement de la commande...', 'loading');
    console.log('📤 Envoi de la commande:', text);

    try {
        const requestBody = {
            text: text,
            brand: selectedBrand
        };

        console.log('Contenu envoyé au serveur:', requestBody);

        const response = await fetch('/process-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('✅ Commande exécutée avec succès!', 'success');
            showResult(data, text);
        } else {
            showStatus(`❌ Erreur: ${data.error}`, 'error');
            console.error('Erreur serveur:', data);
        }
    } catch (error) {
        showStatus(`❌ Erreur de connexion: ${error.message}`, 'error');
        console.error('Erreur réseau:', error);
    }

    // Retour au mode écoute après traitement
    setTimeout(() => {
        if (isListening) {
            showStatus('👂 Écoute H24 réactivée - Dites "Ok lampe" pour commander', 'listening');
        }
    }, 2000);
}

// === ENREGISTREMENT VOCAL MANUEL (bouton) - Garde l'ancienne méthode ===
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

// === TRAITEMENT AUDIO (pour le bouton manuel) ===
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

function showResult(data, originalText = null) {
    let resultHTML = '';

    if (originalText) {
        // Résultat de la commande vocale directe
        resultHTML = `
            <h3>📝 Commande vocale:</h3>
            <p style="font-size: 1.2em; margin-bottom: 15px; font-weight: bold; color: #4CAF50;">
                "${originalText}"
            </p>

            <h3>🧠 Commande parsée:</h3>
            <pre>${JSON.stringify(data.command || data, null, 2)}</pre>

            <h3>💡 Résultat LifX:</h3>
            <pre>${JSON.stringify(data.result || data, null, 2)}</pre>
        `;
    } else {
        // Résultat de l'enregistrement audio (méthode originale)
        resultHTML = `
            <h3>📝 Transcription:</h3>
            <p style="font-size: 1.2em; margin-bottom: 15px; font-weight: bold; color: #4CAF50;">
                "${data.transcription}"
            </p>

            <h3>🧠 Commande parsée:</h3>
            <pre>${JSON.stringify(data.command, null, 2)}</pre>

            <h3>💡 Résultat LifX:</h3>
            <pre>${JSON.stringify(data.result, null, 2)}</pre>
        `;
    }

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
        stopListening();
    }
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
});