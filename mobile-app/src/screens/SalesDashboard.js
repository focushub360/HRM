import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import api, { logActivity } from '../services/api';
import LocationService from '../services/LocationService';

const SalesDashboard = ({ navigation }) => {
    const [locationAddress, setLocationAddress] = useState(null);
    const [status, setStatus] = useState('checked-out');
    const [user, setUser] = useState(null);

    // Timer State
    const [checkInTime, setCheckInTime] = useState(null);
    const [sessionDuration, setSessionDuration] = useState("00:00:00");
    const [currentTime, setCurrentTime] = useState(new Date());

    // Stats State (Mocked data to match web vibe for now, can be API connected later)
    const [stats, setStats] = useState({
        presentDays: 1,
        totalHours: 0.00,
        avgHours: 0.00,
        pendingRequests: 0
    });
    const [totalKm, setTotalKm] = useState(0);

    useEffect(() => {
        const init = async () => {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));

            // Restore Check-In State
            const storedCheckInTime = await AsyncStorage.getItem('checkInTime');
            if (storedCheckInTime) {
                setCheckInTime(new Date(storedCheckInTime));
                setStatus('checked-in');
                checkTrackingStatus();
            }
        };
        init();
    }, []);

    const fetchDailyStats = async () => {
        if (!user) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await api.get(`/gps/stats/${user.empId}?date=${today}`);
            if (response.data) {
                setTotalKm(response.data.totalDistance || 0);
            }
        } catch (error) {
            console.error("Fetch Stats Error:", error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchDailyStats();
            const interval = setInterval(fetchDailyStats, 30000); // Refresh every 30s
            return () => clearInterval(interval);
        }, [user])
    );

    const checkTrackingStatus = async () => {
        // Ensure background task is running if checked in
        const hasStarted = await Location.hasStartedLocationUpdatesAsync('BACKGROUND_LOCATION_TASK');
        if (!hasStarted && status === 'checked-in') {
            LocationService.startBackgroundTracking();
        }
    };

    // Timer Interval
    useEffect(() => {
        let interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            if (status === 'checked-in' && checkInTime) {
                const diff = Math.floor((now - checkInTime) / 1000);
                const hours = Math.floor(diff / 3600);
                const minutes = Math.floor((diff % 3600) / 60);
                const seconds = diff % 60;
                setSessionDuration(
                    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
                );
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [status, checkInTime]);

    const handleCheckIn = async () => {
        // 1. Location Permission
        let { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') return Alert.alert('Permission denied', 'Location access is required.');

        // 2. Start Accuracy Check (Loading feedback could be added here)
        // Alert.alert('Locating...', 'Please wait while we get accurate location.');

        const now = new Date();
        setCheckInTime(now);
        setStatus('checked-in');

        await AsyncStorage.setItem('checkInTime', now.toISOString());
        await LocationService.startBackgroundTracking();

        // 3. Get Accurate Location
        // High accuracy enables GPS
        const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
        });

        const address = await getAddress(loc);
        setLocationAddress(address);

        // 4. Log Activity (Location Only)
        if (user) {
            await logActivity(user, 'GPS_CHECK_IN', 'Mobile Check-In', loc, address);
        }

        // 5. Navigate to Success Splash (No Selfie)
        navigation.navigate('CheckInSuccess', { address });
    };

    const handleCheckOut = async () => {
        setStatus('checked-out');
        setCheckInTime(null);
        setSessionDuration("00:00:00");

        await AsyncStorage.removeItem('checkInTime');
        await LocationService.stopBackgroundTracking();

        const loc = await Location.getCurrentPositionAsync({});
        if (user) await logActivity(user, 'GPS_CHECK_OUT', 'Mobile Check-Out', loc, locationAddress);
        Alert.alert('Success', 'Checked Out & Timer Stopped');
    };

    const getAddress = async (loc) => {
        try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
            if (reverseGeocode.length > 0) {
                const a = reverseGeocode[0];
                let addressText = `${a.city || ''}, ${a.region || ''}`;
                if (a.street) addressText = `${a.street}, ${addressText}`;
                return addressText.replace(/^, /, '').replace(/, $/, '');
            }
        } catch (e) { }
        return "Unknown Location";
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Agent'}</Text>
                    <Text style={styles.date}>{new Date().toDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status === 'checked-in' ? '#d4edda' : '#f8d7da' }]}>
                    <Text style={{ color: status === 'checked-in' ? '#155724' : '#721c24', fontWeight: 'bold' }}>
                        {status === 'checked-in' ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                </View>
            </View>

            {/* Timer Card */}
            <View style={styles.timerCard}>
                <Text style={styles.timerTitle}>Session Duration</Text>
                <Text style={styles.timerDisplay}>{sessionDuration}</Text>
                <View style={styles.timerRow}>
                    <View>
                        <Text style={styles.timerLabel}>In Time</Text>
                        <Text style={styles.timerValue}>{checkInTime ? checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
                    </View>
                    <View>
                        <Text style={styles.timerLabel}>Current</Text>
                        <Text style={styles.timerValue}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>
            </View>

            {/* Action Button */}
            <View style={styles.actionContainer}>
                {status === 'checked-out' ? (
                    <TouchableOpacity style={[styles.button, styles.checkInButton]} onPress={handleCheckIn}>
                        <Ionicons name="play-circle" size={24} color="white" style={{ marginRight: 10 }} />
                        <Text style={styles.buttonText}>CHECK IN</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.button, styles.checkOutButton]} onPress={handleCheckOut}>
                        <Ionicons name="stop-circle" size={24} color="white" style={{ marginRight: 10 }} />
                        <Text style={styles.buttonText}>CHECK OUT</Text>
                    </TouchableOpacity>
                )}
            </View>

            {locationAddress && (
                <Text style={styles.locationText}>
                    <Ionicons name="location-sharp" size={16} color="#007bff" /> {locationAddress}
                </Text>
            )}

            {/* Monthly Summary Grid */}
            <Text style={styles.sectionTitle}>Monthly Summary</Text>
            <View style={styles.statsGrid}>
                {/* Present Days (Green) */}
                <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[styles.statValue, { color: '#198754' }]}>{stats.presentDays}</Text>
                    <Text style={[styles.statLabel, { color: '#198754' }]}>Present Days</Text>
                    <Ionicons name="calendar" size={20} color="#198754" style={{ marginTop: 5 }} />
                </View>

                {/* Total Hours (Blue) */}
                <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.statValue, { color: '#0d6efd' }]}>{stats.totalHours}</Text>
                    <Text style={[styles.statLabel, { color: '#0d6efd' }]}>Total Hours</Text>
                    <Ionicons name="time" size={20} color="#0d6efd" style={{ marginTop: 5 }} />
                </View>

                {/* Distance Traveled (Teal) */}
                <View style={[styles.statCard, { backgroundColor: '#f0fdfa' }]}>
                    <Text style={[styles.statValue, { color: '#0d9488' }]}>{totalKm.toFixed(2)}</Text>
                    <Text style={[styles.statLabel, { color: '#0d9488' }]}>KM Traveled Today</Text>
                    <Ionicons name="navigate" size={20} color="#0d9488" style={{ marginTop: 5 }} />
                </View>

                {/* Avg Hours (Purple) */}
                <View style={[styles.statCard, { backgroundColor: '#fdf4ff' }]}>
                    <Text style={[styles.statValue, { color: '#6f42c1' }]}>{stats.avgHours}</Text>
                    <Text style={[styles.statLabel, { color: '#6f42c1' }]}>Avg Hours/Day</Text>
                    <Ionicons name="stats-chart" size={20} color="#6f42c1" style={{ marginTop: 5 }} />
                </View>

                {/* Pending Requests (Orange) */}
                <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                    <Text style={[styles.statValue, { color: '#fd7e14' }]}>{stats.pendingRequests}</Text>
                    <Text style={[styles.statLabel, { color: '#fd7e14' }]}>Pending Req</Text>
                    <Ionicons name="hourglass" size={20} color="#fd7e14" style={{ marginTop: 5 }} />
                </View>
            </View>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    date: { fontSize: 14, color: '#666' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },

    timerCard: { backgroundColor: 'white', padding: 25, borderRadius: 20, elevation: 4, alignItems: 'center', marginBottom: 25 },
    timerTitle: { fontSize: 14, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
    timerDisplay: { fontSize: 42, fontWeight: 'bold', color: '#333', marginVertical: 10 },
    timerRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
    timerLabel: { fontSize: 12, color: '#999', textAlign: 'center' },
    timerValue: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },

    actionContainer: { marginBottom: 20 },
    button: { flexDirection: 'row', width: '100%', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 5 },
    checkInButton: { backgroundColor: '#198754' },
    checkOutButton: { backgroundColor: '#dc3545' },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },

    locationText: { textAlign: 'center', marginBottom: 30, color: '#007bff', fontWeight: '500' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
    statCard: { width: '48%', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', justifyContent: 'center', minHeight: 110 },
    statValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 }
});

export default SalesDashboard;
