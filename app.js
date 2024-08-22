require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const { setHeaders } = require('./node/helpers/set-headers');
const morgan = require('morgan')
const path = require('path')

const app = express();
app.use(morgan("dev"))
const server = require('http').createServer(app);

if (process.env.ENV === "local") {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS_LOCAL
} else {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS_PROD
}
// Set up Google Cloud clients
const speechClient = new speech.SpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const client = new textToSpeech.TextToSpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Middleware
app.use(setHeaders);
app.use(cors({ origin: process.env.ORIGIN || "*", methods: ['GET', 'PUT', 'POST', 'OPTIONS'] }));
app.use(bodyParser.json());

//DEPLOYMENT
const __dirname1 = path.resolve();
app.use(express.static(path.join(__dirname1, "ui")));
app.get("/home", (req, res) => {
    res.sendFile(path.resolve(__dirname1, "ui", "index.html"))
})
//DEPLOYMENT

app.post('/tts/convert', async (req, res) => {
    const request = {
        input: { text: req.body.text },
        voice: {
            languageCode: 'en-US',
            name: "en-US-Wavenet-F"
        },
        audioConfig: { audioEncoding: 'MP3' },
    };
    try {
        const [response] = await client.synthesizeSpeech(request);
        res.send(response.audioContent);
    } catch (e) {
        console.error(e);
        res.status(400).send({ message: "TTS conversion failed" });
    }
});

app.post('/stt/convert', async (req, res) => {
    try {
        if (!req.body.audioContent) {
            return res.status(400).send({ message: "No audio content provided" });
        }

        const audioBytes = req.body.audioContent; // The audio content sent as base64 string
        const audio = {
            content: audioBytes,
        };

        const config = {
            encoding: 'WEBM_OPUS',  // Use 'WEBM_OPUS' or 'OGG_OPUS' if using Opus codec, or keep 'LINEAR16' if PCM
            sampleRateHertz: 48000,  // Updated to match the actual recording sample rate
            languageCode: 'en-US',   // Adjust as necessary
        };

        const request = {
            audio: audio,
            config: config,
        };

        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        res.send({ transcription });

    } catch (error) {
        console.error('Error during speech-to-text conversion:', error);
        res.status(500).send({ message: "STT conversion failed", error: error.message });
    }
});

// const io = require('socket.io')(server, {
//     cors: {
//         origin: "*",
//         path: '/stt/socket'
//     }
// });
// // WebSocket setup
// // Handle Socket.IO connections
// io.on('connection', (client) => {
//     console.log("Client connected to server");
//     let recognizeStream = null;

//     client.on('join', () => {
//         client.emit('messages', 'Socket Connected to Server');
//     });

//     client.on('messages', (data) => {
//         client.emit('broad', data);
//     });

//     client.on('startGoogleCloudStream', () => {
//         startRecognitionStream(client);
//     });

//     client.on('endGoogleCloudStream', () => {
//         stopRecognitionStream();
//     });

//     client.on('binaryData', (data) => {
//         if (recognizeStream) recognizeStream.write(data);
//     });

//     function startRecognitionStream(client) {
//         stopRecognitionStream(); // Ensure previous stream is closed before starting a new one

//         recognizeStream = speechClient
//             .streamingRecognize(request)
//             .on('error', console.error)
//             .on('data', (data) => {
//                 const transcription = data.results[0]?.alternatives[0]?.transcript;
//                 if (transcription) {
//                     console.log(`Transcription: ${transcription}`);
//                     client.emit('speechData', data);
//                 }

//                 if (data.results[0]?.isFinal) {
//                     stopRecognitionStream();
//                     startRecognitionStream(client);
//                 }
//             });
//     }

//     function stopRecognitionStream() {
//         if (recognizeStream) {
//             recognizeStream.end();
//         }
//         recognizeStream = null;
//     }
// });


// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server is up and running on port: ${port}`);
});
