import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../../context/AuthContext';

const FaceProctoring = () => {
  const { user, isAuthenticated } = useAuth();
  const videoRef = useRef();
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const streamRef = useRef(null);
  
  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'employee') return;
    
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('./models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
        setIsModelsLoaded(true);
        startVideo();
      } catch (err) {
        console.error('Error loading AI models:', err);
      }
    };
    loadModels();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isAuthenticated, user]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        let video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();
        }
      })
      .catch((err) => {
        console.error('Camera error in background proctoring:', err);
      });
  };

  useEffect(() => {
    // If no stored baseline descriptor, we can't do verification
    if (!isModelsLoaded || !user?.faceDescriptor) return;

    const baselineDescriptor = new Float32Array(user.faceDescriptor);

    const interval = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const detections = await faceapi.detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptor();

          let mismatchAlert = false;
          let alertnessScore = 100;
          let status = 'Active';

          if (detections) {
            const distance = faceapi.euclideanDistance(baselineDescriptor, detections.descriptor);
            // 0.6 is the default threshold. Lower is stricter.
            if (distance > 0.55) {
              mismatchAlert = true;
              status = 'Mismatch';
            }
          } else {
             // No face detected
             alertnessScore = 0;
             status = 'Away';
          }

          // Send to backend
          const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api');
          fetch(`${API_URL}/proctoring/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empId: user.id || user.email,
              name: user.name,
              companyId: user.companyId,
              status,
              alertnessScore,
              blinks: Math.floor(Math.random() * 5) + 10, // Simulated blinks for now
              mismatchAlert
            })
          }).catch(console.error);

        } catch (e) {
          console.error('Face verification error', e);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isModelsLoaded, user]);

  if (!isAuthenticated || user?.type !== 'employee') return null;

  return (
    <video ref={videoRef} style={{ display: 'none' }} muted />
  );
};

export default FaceProctoring;
