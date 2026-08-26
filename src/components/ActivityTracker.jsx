import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const INACTIVITY_THRESHOLD = 150000; // 150 seconds (2.5 mins)
const LOCATION_UPDATE_INTERVAL = 300000; // 5 minutes

const ActivityTracker = () => {
    const { user, logActivity, notifyInactivityAlert } = useAuth();

    // IMPORTANT: every hook below runs on EVERY render, unconditionally.
    // The old version had `if (!user || ...) return null;` BEFORE these
    // hooks, so on some renders 5 hooks ran and on others 7 ran (once the
    // two useEffect calls further down were reached). React requires the
    // exact same hooks, in the exact same order, on every render — this
    // is why the previous version could throw "Rendered fewer hooks than
    // during the previous render" the moment `user` changed from
    // null/non-employee to an employee object (e.g. right after login).
    // Nothing else in this file changed the actual tracking behavior.
    const [isInactive, setIsInactive] = useState(false);
    const timerRef = useRef(null);
    const locationIntervalRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    const isInactiveRef = useRef(false);

    // Only track for regular employees — never company/company_admin/hr/admin.
    const isTrackedEmployee =
        !!user &&
        user.type === 'employee' &&
        user.type !== 'company' &&
        user.type !== 'company_admin' &&
        user.type !== 'hr' &&
        user.role !== 'admin';

    useEffect(() => {
        isInactiveRef.current = isInactive;
    }, [isInactive]);

    // --- Inactivity Logic ---
    const resetInactivityTimer = () => {
        if (!isTrackedEmployee) return;

        const isCheckedIn = localStorage.getItem("isActiveCheckIn") === "true";

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (!isCheckedIn) {
            if (isInactiveRef.current) {
                setIsInactive(false);
            }
            return;
        }

        if (isInactiveRef.current) {
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
        if (!isTrackedEmployee) return;

        const isCheckedIn = localStorage.getItem("isActiveCheckIn") === "true";
        if (!isCheckedIn) return;

        if (!isInactiveRef.current) {
            console.log('Inactivity detected');
            setIsInactive(true);
            notifyInactivityAlert({
                action: 'INACTIVITY_DETECTED',
                duration: INACTIVITY_THRESHOLD,
                details: 'No mouse/keyboard activity for 150 seconds (2.5 mins)!'
            });
        }
    };

    // --- Location Logic (kept for parity; not wired to an interval, matching original) ---
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

        // eslint-disable-next-line no-unreachable
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
        if (!isTrackedEmployee) return;

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        resetInactivityTimer();

        const eventHandler = () => resetInactivityTimer();

        events.forEach(event => {
            window.addEventListener(event, eventHandler);
        });

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
    }, [isTrackedEmployee, user?.empId]);

    // 2. Location Tracking Effect - DISABLED for Web as per requirement
    useEffect(() => {
        return () => {
            if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        };
    }, []);

    // All hooks have already run by this point on every render, so it's
    // safe to conditionally skip rendering output here.
    if (!isTrackedEmployee) {
        return null;
    }

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