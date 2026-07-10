import { useRef, useState } from "react";
import Webcam from "react-webcam";
import api from "../api/axios";

function FaceLogin({ username, onSuccess, onBack }) {
  const webcamRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const captureFace = async () => {
    if (!username) {
      setMessage("Please enter username first.");
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) {
      setMessage("Unable to capture image.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/face-login/", {
        username,
        face_image: imageSrc,
      });

      setMessage(response.data.message);

      if (response.data.status === "success") {
        onSuccess(response.data);
      }
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={true}
        screenshotFormat="image/jpeg"
        className="w-full h-56 rounded-xl object-cover border-2 border-gray-700"
      />

      <button
        onClick={captureFace}
        disabled={loading}
        className="bg-pink-500 hover:bg-pink-600 text-white py-2 rounded"
      >
        {loading ? "Checking Face..." : "Login with Face"}
      </button>

      <button
        onClick={onBack}
        className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
      >
        Back to Password Login
      </button>

      {message && <p className="text-center text-green-400">{message}</p>}
    </div>
  );
}

export default FaceLogin;
