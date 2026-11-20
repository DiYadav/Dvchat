import { useEffect, useRef, useState } from "react";

function ProfileCamera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera error:", err);
        setError("Unable to access camera. Please check camera permissions.");
      }
    };

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

const capturePhoto = () => {
  console.log("Capture function started");

  const video = videoRef.current;

  if (!video) {
    console.log("Video element not found");
    setError("Video element not found.");
    return;
  }

  console.log("Video dimensions:", video.videoWidth, video.videoHeight);

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    setError("Camera is not ready yet. Please wait.");
    return;
  }

  const canvas = document.createElement("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    setError("Unable to create canvas context.");
    return;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  console.log("Photo drawn on canvas");

  canvas.toBlob((blob) => {
    if (!blob) {
      console.log("Blob creation failed");
      setError("Unable to capture photo.");
      return;
    }

    console.log("Photo captured successfully:", blob);

const file = new File([blob], "profile-photo.jpg", {
  type: "image/jpeg",
});

console.log("Captured file:", file);
console.log("Is File:", file instanceof File);
console.log("File name:", file.name);
console.log("File size:", file.size);
console.log("File type:", file.type);

if (!(file instanceof File) || file.size === 0) {
  setError("Invalid captured image.");
  return;
}

console.log("Sending image to parent component");

onCapture(file);
  }, "image/jpeg");
};

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white">Take Profile Photo</h3>

      {error && <p className="text-red-400">{error}</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full rounded-xl"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            console.log("Capture button clicked");
            capturePhoto();
          }}
          className="bg-teal-500 px-4 py-2 rounded-lg font-semibold"
        >
          Capture Photo
        </button>

        <button
         type="button"
          onClick={onClose}
          className="bg-gray-600 px-4 py-2 rounded-lg text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ProfileCamera;
