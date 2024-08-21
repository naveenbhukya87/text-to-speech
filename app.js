require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const { setHeaders } = require('./node/helpers/set-headers');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        path: '/stt/socket'
    }
});

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
app.use('/stt/assets', express.static(__dirname + '/public'));
app.use('/stt/session/assets', express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

// Routes
app.get('/stt/home', (req, res) => {
    res.render('index', {});
});

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

// WebSocket setup
io.on('connection', (client) => {
    console.log("Client connected to server");
    let recognizeStream = null;

    client.on('join', () => {
        client.emit('messages', 'Socket Connected to Server');
    });

    client.on('messages', (data) => {
        client.emit('broad', data);
    });

    client.on('startGoogleCloudStream', (data) => {
        startRecognitionStream(client);
    });

    client.on('endGoogleCloudStream', () => {
        stopRecognitionStream();
    });

    client.on('binaryData', (data) => {
        if (recognizeStream) recognizeStream.write(data);
    });

    function startRecognitionStream(client) {
        stopRecognitionStream(); // Ensure previous stream is closed before starting a new one

        recognizeStream = speechClient
            .streamingRecognize(request)
            .on('error', console.error)
            .on('data', (data) => {
                const transcription = data.results[0]?.alternatives[0]?.transcript;
                if (transcription) {
                    console.log(`Transcription: ${transcription}`);
                    client.emit('speechData', data);
                }

                if (data.results[0]?.isFinal) {
                    stopRecognitionStream();
                    startRecognitionStream(client);
                }
            });
    }

    function stopRecognitionStream() {
        if (recognizeStream) {
            recognizeStream.end();
        }
        recognizeStream = null;
    }
});

// Google Cloud Speech-to-Text configuration
const request = {
    config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        profanityFilter: false,
        enableWordTimeOffsets: true,
    },
    interimResults: true
};

// Start server
const port = process.env.PORT || 8008;
server.listen(port, () => {
    console.log(`Server is up and running on port: ${port}`);
});
