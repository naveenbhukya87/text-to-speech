let mediaRecorder;
let audioChunks = [];

const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const status = document.getElementById('status');
const transcription = document.getElementById('transcription');

// Start Recording
recordButton.addEventListener('click', async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioChunks = [];
                const base64Audio = await convertBlobToBase64(audioBlob);
                sendAudioToServer(base64Audio);
            };
            mediaRecorder.start();
            status.textContent = "Recording...";
            recordButton.disabled = true;
            stopButton.disabled = false;
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    } else {
        alert('Your browser does not support audio recording.');
    }
});

// Stop Recording
stopButton.addEventListener('click', () => {
    mediaRecorder.stop();
    status.textContent = "Processing...";
    recordButton.disabled = false;
    stopButton.disabled = true;
});

// Convert Blob to Base64
function convertBlobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Send Audio to Server
async function sendAudioToServer(base64Audio) {
    try {
        const response = await fetch('http://localhost:5000/stt/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ audioContent: base64Audio })
        });
        const data = await response.json();
        if (response.ok) {
            transcription.textContent = data.transcription;
            status.textContent = "Transcription completed.";
        } else {
            transcription.textContent = "Error: " + data.message;
            status.textContent = "Transcription failed.";
        }
    } catch (error) {
        console.error('Error sending audio to server:', error);
        status.textContent = "Error sending audio to server.";
    }
}