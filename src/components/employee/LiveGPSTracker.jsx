import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

// Helper function to calculate distance in meters between two coordinates
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
};

const LiveGPSTracker = () => {
    const { user, isAuthenticated } = useAuth();
    const lastPosRef = useRef(null);
    const watchIdRef = useRef(null);
    
    // Config: minimum distance in meters before logging to backend to save battery/bandwidth
    const MIN_DISTANCE_METERS = 30; 

    useEffect(() => {
        // Only run for employees
        if (!isAuthenticated || !user || user.type !== 'employee') return;

        // Check if checked in (optional: if you only want to track while checked in)
        // const isCheckedIn = localStorage.getItem("isActiveCheckIn") === "true";
        // if (!isCheckedIn) return;

        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by this browser.");
            return;
        }

        const handlePositionUpdate = async (position) => {
            const { latitude, longitude } = position.coords;
            const now = new Date().toISOString();

            // Check distance from last reported position
            if (lastPosRef.current) {
                const dist = getDistance(
                    lastPosRef.current.lat, 
                    lastPosRef.current.lng, 
                    latitude, 
                    longitude
                );
                
                // Ignore small jitter
                if (dist < MIN_DISTANCE_METERS) {
                    return;
                }
            }

            // Update ref
            lastPosRef.current = { lat: latitude, lng: longitude, time: now };

            // Send to backend
            try {
                const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api');
                
                await fetch(`${API_URL}/gps/route`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id || user.email,
                        companyId: user.companyId,
                        latitude,
                        longitude,
                        timestamp: now
                    })
                });
                console.log("GPS Route Point Logged:", latitude, longitude);
            } catch (error) {
                console.error("Failed to log GPS route point:", error);
            }
        };

        const handleError = (error) => {
            console.warn("GPS Tracking Error:", error);
        };

        // Start continuous tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePositionUpdate, 
            handleError, 
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 10000
            }
        );

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [isAuthenticated, user]);

    return null; // Silent background component
};

export default LiveGPSTracker;
