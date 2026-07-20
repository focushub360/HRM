import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const FaceCaptureModal = ({ user, onComplete, onCancel }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [status, setStatus] = useState('Loading AI Models...');
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('./models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
        setIsModelsLoaded(true);
        setStatus('Models loaded. Starting camera...');
        startVideo();
      } catch (err) {
        setStatus('Error loading AI models: ' + err.message);
      }
    };
    loadModels();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        let video = videoRef.current;
        video.srcObject = stream;
        video.play();
        setStatus('Please look at the camera...');
      })
      .catch((err) => {
        setStatus('Camera error: ' + err.message);
      });
  };

  const captureAndVerify = async () => {
    if (!isModelsLoaded || !videoRef.current) return;
    setStatus('Detecting face...');
    
    try {
      const detections = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setStatus('No face detected! Please ensure your face is clearly visible.');
        return;
      }

      setStatus('Face detected! Saving profile...');

      // Capture image as base64
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);

      const descriptorArray = Array.from(detections.descriptor);

      // Save to backend
      const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api');
      const response = await fetch(`${API_URL}/users/${user.id}/face-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileImageBase64: base64Image,
          faceDescriptor: descriptorArray
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save to backend');
      }

      setStatus('Success! Logging you in...');
      setTimeout(() => {
        onComplete({ profileImage: base64Image, faceDescriptor: descriptorArray });
      }, 1000);

    } catch (err) {
      console.error(err);
      setStatus('Verification failed. Try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', maxWidth: '500px' }}>
        <h3 className="mb-3">Face Verification Registration</h3>
        <p className="text-muted mb-4">{status}</p>
        
        <div style={{ position: 'relative', width: '320px', height: '240px', margin: '0 auto', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
        </div>

        <div className="mt-4 d-flex justify-content-center gap-3">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={captureAndVerify} disabled={!isModelsLoaded}>Capture & Continue</button>
        </div>
      </div>
    </div>
  );
};

export default FaceCaptureModal;
