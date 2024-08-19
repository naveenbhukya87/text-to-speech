import React, { useState } from "react";
import { ReactMic } from "react-mic";
import axios from "axios";

const VoiceRecorder = () => {
  const [record, setRecord] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);

  const startRecording = () => {
    setRecord(true);
  };

  const stopRecording = () => {
    setRecord(false);
  };

  const onData = (recordedBlob) => {
    console.log("Chunk of real-time data is: ", recordedBlob);
  };

  const onStop = (recordedBlob) => {
    console.log("Recorded Blob is: ", recordedBlob);
    setAudioBlob(recordedBlob.blob);
    sendAudioToServer(recordedBlob.blob);
  };

  const sendAudioToServer = async (blob) => {
    const formData = new FormData();
    formData.append("audio", blob, "audio.wav");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/convert-audio",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("Server response:", response.data);
      alert(`Transcription: ${response.data.transcription}`); // Display transcription result
    } catch (error) {
      console.error("Error sending audio to server:", error);
      alert("There was an error processing your request. Please try again.");
    }
  };

  return (
    <div>
      {/* <ReactMic
        record={record}
        className="sound-wave"
        onStop={onStop}
        onData={onData}
        strokeColor="#000000"
        backgroundColor="#FF4081"
        mimeType="audio/wav" // Ensure correct mimeType
      /> */}
      <ReactMic
        record={record}
        className="sound-wave"
        onStop={onStop}
        mimeType="audio/wav" // Ensure this matches backend expectations
        strokeColor="#000000"
        backgroundColor="#FF4081"
      />

      <button onClick={startRecording} type="button">
        Start
      </button>
      <button onClick={stopRecording} type="button">
        Stop
      </button>
    </div>
  );
};

export default VoiceRecorder;
