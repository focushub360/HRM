import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const INACTIVITY_THRESHOLD = 150000; // 150 seconds (2.5 mins)
const LOCATION_UPDATE_INTERVAL = 300000; // 5 minutes

const ActivityTracker = () => {
    const { user, logActivity, notifyInactivityAlert } = useAuth();
    const [isInactive, setIsInactive] = useState(false);
    const timerRef = useRef(null);
    const locationIntervalRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    // Only run for employees - EXPLICITLY BLOCK ADMIN/HR
    if (!user || user.type === 'company' || user.type === 'company_admin' || user.type === 'hr' || user.role === 'admin') {
        return null;
    }

    if (user.type !== 'employee') {
        return null;
    }

    // --- Inactivity Logic ---
    const resetInactivityTimer = () => {
        const isCheckedIn = localStorage.getItem("isActiveCheckIn") === "true";

        // Always clear existing timer first
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Only track if checked in
        if (!isCheckedIn) {
            // If not checked in, ensure inactivity state is reset if it was active
            if (isInactive) {
                setIsInactive(false);
            }
            return;
        }

        if (isInactive) {
            console.log('User active again');
            setIsInactive(false);
            logActivity({ action: 'ACTIVE', details: 'User resumed activity' });
        }

        lastActivityRef.current = Date.now();

        timerRef.current = setTimeout(() => {
            handleInactivity();
        }, INACTIVITY_THRESHOLD);
    };

    const handleInactivity = () => {
        const isCheckedIn = localStorage.getItem("isActiveCheckIn") === "true";
        if (!isCheckedIn) return;

        if (!isInactive) {
            console.log('Inactivity detected');
            setIsInactive(true);
            notifyInactivityAlert({
                action: 'INACTIVITY_DETECTED',
                duration: INACTIVITY_THRESHOLD,
                details: 'No mouse/keyboard activity for 150 seconds (2.5 mins)!'
            });
        }
    };

    // --- Location Logic ---
    const fetchAddress = async (lat, lon) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            return data.display_name?.split(',').slice(0, 3).join(',') || 'Unknown Location';
        } catch (error) {
            console.error("Geocoding failed", error);
            return null;
        }
    };

    const trackLocation = () => {
        // EXPLICITLY DISABLED FOR WEB - Do not run.
        return;

        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const address = await fetchAddress(latitude, longitude);

            logActivity({
                action: 'LOCATION_UPDATE',
                details: 'Periodic location tracking',
                latitude,
                longitude,
                address
            });
        }, (err) => {
            console.error("Location access denied or failed", err);
        });
    };

    // --- Effects ---

    // 1. Inactivity Tracking Effect
    useEffect(() => {
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Initial setup
        resetInactivityTimer();

        const eventHandler = () => resetInactivityTimer();

        events.forEach(event => {
            window.addEventListener(event, eventHandler);
        });

        // Poll for check-in status changes to start/stop tracking
        const checkInPoller = setInterval(() => {
            resetInactivityTimer();
        }, 5000);

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, eventHandler);
            });
            if (timerRef.current) clearTimeout(timerRef.current);
            clearInterval(checkInPoller);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.empId]);

    // 2. Location Tracking Effect - DISABLED for Web as per requirement
    // Only Check-In/Check-Out location is needed.
    // Periodic tracking is removed to prevent "very frequent" logs.
    useEffect(() => {
        // Start tracking location
        // trackLocation(); 
        // locationIntervalRef.current = setInterval(trackLocation, LOCATION_UPDATE_INTERVAL);

        return () => {
            if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            {isInactive && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>
                        <strong>Inactivity Detected</strong>
                        <div style={{ fontSize: '0.8em' }}>Logging alert to HR...</div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ActivityTracker;
