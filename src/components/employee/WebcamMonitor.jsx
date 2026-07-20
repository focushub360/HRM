import React, { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { useAuth } from '../../context/AuthContext';

const WebcamMonitor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { user } = useAuth();
  
  const [status, setStatus] = useState('Initializing...');
  const [blinkCount, setBlinkCount] = useState(0);
  const [alertness, setAlertness] = useState(100);
  const [deviceAlertness, setDeviceAlertness] = useState(100);
  const [hrFlags, setHrFlags] = useState(0);
  
  const blinkCountRef = useRef(0);
  const lastBlinkTimeRef = useRef(Date.now());
  const eyeClosedRef = useRef(false);
  const sleepFramesRef = useRef(0);
  const lastReportedStatusRef = useRef('Initializing...');
  const lastDeviceActivityRef = useRef(Date.now());
  
  // Track metrics for the reporting interval
  const metricsRef = useRef({
    totalFrames: 0,
    facePresentFrames: 0,
    blinksSinceLastReport: 0,
  });

  // Euclidean distance between two 3D points
  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
  };

  // Calculate Eye Aspect Ratio
  const calculateEAR = (landmarks, indices) => {
    // MediaPipe specific indices for eye (simplified)
    // Horizontal: indices 0 and 3
    // Vertical 1: indices 1 and 5
    // Vertical 2: indices 2 and 4
    const p1 = landmarks[indices[0]];
    const p2 = landmarks[indices[1]];
    const p3 = landmarks[indices[2]];
    const p4 = landmarks[indices[3]];
    const p5 = landmarks[indices[4]];
    const p6 = landmarks[indices[5]];

    const vertical1 = distance(p2, p6);
    const vertical2 = distance(p3, p5);
    const horizontal = distance(p1, p4);

    return (vertical1 + vertical2) / (2.0 * horizontal);
  };

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      metricsRef.current.totalFrames++;

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        metricsRef.current.facePresentFrames++;
        setStatus('Present & Monitoring');
        
        const landmarks = results.multiFaceLandmarks[0];
        
        // Left eye: 33, 160, 158, 133, 153, 144
        const leftEyeIndices = [33, 160, 158, 133, 153, 144];
        // Right eye: 362, 385, 387, 263, 373, 380
        const rightEyeIndices = [362, 385, 387, 263, 373, 380];

        const leftEAR = calculateEAR(landmarks, leftEyeIndices);
        const rightEAR = calculateEAR(landmarks, rightEyeIndices);
        
        const avgEAR = (leftEAR + rightEAR) / 2.0;

        // Threshold for blink (typically around 0.2 to 0.25)
        if (avgEAR < 0.22) {
          sleepFramesRef.current++;
          
          if (!eyeClosedRef.current) {
            eyeClosedRef.current = true;
          }
          
          if (sleepFramesRef.current > 15) { // Roughly 1 second depending on FPS
            setStatus('Sleeping');
          }
        } else {
          if (eyeClosedRef.current) {
            // Count as a blink when eyes reopen, unless they were sleeping
            if (sleepFramesRef.current <= 15) {
              blinkCountRef.current++;
              metricsRef.current.blinksSinceLastReport++;
              setBlinkCount(blinkCountRef.current);
            }
          }
          eyeClosedRef.current = false;
          sleepFramesRef.current = 0;
          
          // Revert status if they wake up
          setStatus((prev) => prev === 'Sleeping' ? 'Present & Monitoring' : prev);
        }

        // Draw debug overlay
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          // Simplified debug drawing - just a bounding box or text
          ctx.fillStyle = 'lime';
          ctx.font = '16px Arial';
          ctx.fillText(`EAR: ${avgEAR.toFixed(2)}`, 10, 20);
        }

      } else {
        setStatus('Away from Desk');
        if (canvasRef.current) {
           const ctx = canvasRef.current.getContext('2d');
           ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      // Calculate rolling alertness based on face presence ratio in recent frames
      if (metricsRef.current.totalFrames > 0) {
        const presenceRatio = (metricsRef.current.facePresentFrames / metricsRef.current.totalFrames) * 100;
        setAlertness(Math.round(presenceRatio));
      }
    });

    const sendReport = async (currentStatus) => {
       const m = metricsRef.current;
       const reportData = {
         userId: user.id,
         empId: user.empId,
         name: user.name,
         companyId: user.companyId,
         timestamp: new Date().toISOString(),
         blinks: m.blinksSinceLastReport,
         alertnessScore: Math.round((m.facePresentFrames / Math.max(m.totalFrames, 1)) * 100),
         status: currentStatus
       };

       console.log("📤 Sending Proctoring Report: ", reportData);
       
       try {
         const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}`;
         await fetch(`${API_URL}/proctoring/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
         });
       } catch (err) {
         console.error("Failed to send proctoring log", err);
       }

       metricsRef.current = {
         totalFrames: 0,
         facePresentFrames: 0,
         blinksSinceLastReport: 0
       };
       lastReportedStatusRef.current = currentStatus;
    };

    // Device Activity Tracker (Keyboard / Mouse)
    const handleDeviceActivity = () => {
      lastDeviceActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleDeviceActivity);
    window.addEventListener('keydown', handleDeviceActivity);
    window.addEventListener('click', handleDeviceActivity);
    window.addEventListener('scroll', handleDeviceActivity);

    // Device Alertness Calculator (runs every second)
    const deviceInterval = setInterval(() => {
       const idleSeconds = Math.floor((Date.now() - lastDeviceActivityRef.current) / 1000);
       // 100% for first 30 seconds of idle, then drops 2% per second
       if (idleSeconds <= 30) {
         setDeviceAlertness(100);
       } else {
         const drop = (idleSeconds - 30) * 2;
         setDeviceAlertness(Math.max(0, 100 - drop));
       }
    }, 1000);

    let camera = null;
    
    const startCamera = async () => {
      try {
        // First check if a camera is available and we have permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Release the test stream immediately
        stream.getTracks().forEach(track => track.stop());

        if (videoRef.current) {
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current) {
                 await faceMesh.send({image: videoRef.current});
              }
            },
            width: 320,
            height: 240
          });
          camera.start();
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setStatus(err.name === 'NotFoundError' ? 'No Camera Found' : 'Camera Access Denied');
        if (canvasRef.current) {
           const ctx = canvasRef.current.getContext('2d');
           ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
           ctx.fillStyle = 'red';
           ctx.font = '14px Arial';
           ctx.fillText(err.name === 'NotFoundError' ? 'No Camera Device' : 'Camera Blocked', 10, 120);
        }
      }
    };

    startCamera();

    // Reporting Interval (Every 60 seconds)
    const reportInterval = setInterval(() => {
       setStatus(current => {
           let reportStatus = current;
           if (current === 'Present & Monitoring') {
             const m = metricsRef.current;
             reportStatus = (m.facePresentFrames > (m.totalFrames * 0.1)) ? 'Active' : 'Away from Desk';
           }
           sendReport(reportStatus === 'Present & Monitoring' ? 'Active' : reportStatus);
           return current;
       });
    }, 60000);

    return () => {
      clearInterval(reportInterval);
      clearInterval(deviceInterval);
      window.removeEventListener('mousemove', handleDeviceActivity);
      window.removeEventListener('keydown', handleDeviceActivity);
      window.removeEventListener('click', handleDeviceActivity);
      window.removeEventListener('scroll', handleDeviceActivity);
      if (camera) camera.stop();
      faceMesh.close();
    };
  }, [user]);

  // Trigger immediate report if status becomes Sleeping or Away or Camera missing
  useEffect(() => {
    if ((status === 'Sleeping' || status === 'Away from Desk' || status === 'No Camera Found' || status === 'Camera Access Denied') && lastReportedStatusRef.current !== status) {
       // We can't access sendReport directly here easily, but we can trigger a state change or just rely on the effect.
       // Let's just fetch directly here for critical alerts.
       const reportData = {
         userId: user.id,
         empId: user.empId,
         name: user.name,
         companyId: user.companyId,
         timestamp: new Date().toISOString(),
         blinks: blinkCount,
         alertnessScore: alertness,
         status: status === 'Away from Desk' ? 'Away' : status
       };
       
       try {
         const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}`;
         fetch(`${API_URL}/proctoring/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
         });
         
         if (status === 'Sleeping' || status === 'Away from Desk' || status === 'No Camera Found' || status === 'Camera Access Denied') {
            setHrFlags(prev => prev + 1);
         }
       } catch (err) {}
       
       lastReportedStatusRef.current = status;
    }
  }, [status, user, blinkCount, alertness]);

  return (
    <div className="card border-0 shadow-sm mb-4 position-relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
      {(status === 'Sleeping' || status === 'Away from Desk' || status === 'No Camera Found' || status === 'Camera Access Denied') && (
       <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center z-3" style={{ backgroundColor: 'rgba(220, 38, 38, 0.95)', backdropFilter: 'blur(10px)' }}>
          <h2 className="fw-bold text-white mb-2 text-center">
            {status === 'Sleeping' ? '😴 WAKE UP!' : 
             status === 'Away from Desk' ? '🪑 RETURN TO SCREEN' : 
             '📷 CAMERA REQUIRED'}
          </h2>
          <div className="text-white text-center px-4 small">
            {status === 'No Camera Found' || status === 'Camera Access Denied' ? 
              <>You must enable your webcam to continue working.<br/>HR has been notified.</> : 
              <>Your activity has been flagged as inactive.<br/>HR has been notified.</>
            }
          </div>
          <small className="text-white mt-3 opacity-75">
            {status === 'No Camera Found' || status === 'Camera Access Denied' ? 
              '(Please plug in your camera and reload)' : 
              '(Return your face to the camera to clear)'
            }
          </small>
       </div>
      )}
      
      <div className="card-header border-0 bg-transparent py-3">
        <h6 className="mb-0 fw-bold d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
          <span className={`me-2 rounded-circle ${status.includes('Away') ? 'bg-danger' : 'bg-success'}`} style={{ width: '10px', height: '10px', display: 'inline-block' }}></span>
          Remote AI Proctoring
        </h6>
      </div>
      <div className="card-body pt-0 pb-3">
        <div className="d-flex flex-column flex-md-row gap-3">
          <div className="position-relative overflow-hidden rounded bg-dark" style={{ width: '160px', height: '120px', flexShrink: 0 }}>
            <video 
              ref={videoRef} 
              className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover" 
              autoPlay 
              playsInline 
              muted 
              style={{ transform: 'scaleX(-1)' }} 
            />
            <canvas 
              ref={canvasRef} 
              className="position-absolute top-0 start-0 w-100 h-100" 
              width="320" 
              height="240"
              style={{ transform: 'scaleX(-1)' }} 
            />
            <div className="position-absolute bottom-0 start-0 w-100 p-1 text-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <small className="text-white fw-medium" style={{ fontSize: '0.65rem' }}>{status}</small>
            </div>
          </div>
          
          <div className="flex-grow-1 d-flex flex-column justify-content-center">
            <div className="row g-2">
              <div className="col-sm-6 col-md-3">
                <div className="p-2 rounded bg-light h-100" style={{ backgroundColor: 'var(--bg-main)' }}>
                  <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>Camera Alertness</small>
                  <div className="d-flex align-items-center">
                    <div className="progress flex-grow-1 me-2" style={{ height: '6px' }}>
                      <div className={`progress-bar ${alertness > 80 ? 'bg-success' : alertness > 50 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${alertness}%` }}></div>
                    </div>
                    <span className="fw-bold text-dark small">{alertness}%</span>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-md-3">
                <div className="p-2 rounded bg-light h-100" style={{ backgroundColor: 'var(--bg-main)' }}>
                  <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>Device Alertness</small>
                  <div className="d-flex align-items-center">
                    <div className="progress flex-grow-1 me-2" style={{ height: '6px' }}>
                      <div className={`progress-bar ${deviceAlertness > 80 ? 'bg-info' : deviceAlertness > 50 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${deviceAlertness}%` }}></div>
                    </div>
                    <span className="fw-bold text-dark small">{deviceAlertness}%</span>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-md-3">
                <div className="p-2 rounded bg-light h-100" style={{ backgroundColor: 'var(--bg-main)' }}>
                  <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>Blink Count</small>
                  <span className="fw-bold text-dark small">{blinkCount}</span>
                </div>
              </div>
              <div className="col-sm-6 col-md-3">
                <div className="p-2 rounded bg-light h-100" style={{ backgroundColor: 'var(--bg-main)' }}>
                  <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>HR Flags Sent</small>
                  <span className={`fw-bold small ${hrFlags > 0 ? 'text-danger' : 'text-success'}`}>{hrFlags}</span>
                </div>
              </div>
              <div className="col-12 mt-2">
                <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                  <i className="bi bi-info-circle me-1"></i>
                  Data is processed locally in your browser. Only presence metadata is securely transmitted to HR.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamMonitor;
