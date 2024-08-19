require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const cors = require('cors')
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
    throw new Error('The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
}

const app = express();
app.use(cors())
const upload = multer({ dest: 'uploads/' });

const speechClient = new SpeechClient();

app.post('/api/convert-audio1', upload.single('audio'), async (req, res) => {
    const audioFilePath = req.file.path;
    const file = fs.readFileSync(audioFilePath);
    const audioBytes = file.toString('base64');
    const audio = {
        content: audioBytes,
    };

    const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        audioChannelCount: 2, // Ensure this matches the number of channels in your audio file
    };

    const request = {
        audio: audio,
        config: config,
    };

    try {
        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        console.log(`Transcription: ${transcription}`);
        res.json({ transcription });
    } catch (error) {
        console.error('Error transcribing audio:', error);
        res.status(500).send('Error transcribing audio');
    } finally {
        fs.unlinkSync(audioFilePath); // Remove file after processing
    }
});

app.post('/api/convert-audio', upload.single('audio'), async (req, res) => {
    console.log('File received:', req.file); // Log file info
    console.log('MIME type:', req.file.mimetype); // Log MIME type
    console.log('File path:', req.file.path); // Log file path

    const audioFilePath = req.file.path;
    const file = fs.readFileSync(audioFilePath);
    const audioBytes = file.toString('base64');
    const audio = { content: audioBytes };

    const config = {
        encoding: 'LINEAR16', // Ensure this matches your input format
        sampleRateHertz: 48000, // Confirm that this matches your audio file
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        audioChannelCount: 2, // Ensure this matches the number of channels in your audio file
    };


    const request = {
        audio: audio,
        config: config,
    };

    try {
        const [operation] = await speechClient.longRunningRecognize(request);
        const [response] = await operation.promise();
        console.log('Full API Response:', response); // Log API response
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        console.log(`Transcription: ${transcription}`);
        res.json({ transcription });
    } catch (error) {
        console.error('Error transcribing audio:', error);
        res.status(500).send('Error transcribing audio');
    } finally {
        fs.unlinkSync(audioFilePath); // Remove file after processing
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
