import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error("Location Task Error:", error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0]; // Get the most recent location

        if (location) {
            try {
                // Retrieve user data from storage
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);

                    // POST to Backend
                    await api.post('/gps/route', {
                        userId: user.empId,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        timestamp: new Date().toISOString(),
                        type: 'BACKGROUND_PING' // Tag it
                    });
                    console.log("Background Location Sent:", location.coords);
                }
            } catch (err) {
                console.error("Background Sync Failed:", err);
            }
        }
    }
});

const LocationService = {
    startBackgroundTracking: async () => {
        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status !== 'granted') {
                console.log("Background location permission denied");
                return;
            }

            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.High,
                timeInterval: 60000, // 1 minute in ms
                distanceInterval: 20, // Update if moved at least 20m
                deferredUpdatesInterval: 60000,
                foregroundService: {
                    notificationTitle: "HRMS Tracking Active",
                    notificationBody: "Tracking location for field activity.",
                    notificationColor: "#007bff"
                }
            });
            console.log("Background Tracking Started");
        } catch (e) {
            console.error("Start Tracking Error:", e);
        }
    },

    stopBackgroundTracking: async () => {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (hasStarted) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                console.log("Background Tracking Stopped");
            }
        } catch (e) {
            console.error("Stop Tracking Error:", e);
        }
    }
};

export default LocationService;
