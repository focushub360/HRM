import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { logActivity } from '../services/api';

export default function DashboardScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('OUT'); // OUT or IN
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        loadUser();
        requestLocationPermission();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            } else {
                navigation.replace('Login');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const requestLocationPermission = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setErrorMsg('Permission to access location was denied');
            Alert.alert('Permission denied', 'Location is required for attendance.');
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
    };

    const handleClockIn = async () => {
        await processAttendance('CLOCK_IN');
    };

    const handleClockOut = async () => {
        await processAttendance('CLOCK_OUT');
    };

    const processAttendance = async (action) => {
        if (!location) {
            await requestLocationPermission();
            if (!location) {
                Alert.alert('Location Error', 'Unable to fetch location. Please try again.');
                return;
            }
        }

        setLoading(true);
        try {
            await logActivity(user, action, 'Mobile Attendance', location);
            setStatus(action === 'CLOCK_IN' ? 'IN' : 'OUT');
            Alert.alert('Success', `Successfully ${action === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out'}!`);
        } catch (error) {
            Alert.alert('Error', 'Failed to log attendance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('user');
        navigation.replace('Login');
    };

    if (!user) return <View style={styles.center}><ActivityIndicator /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome, {user.name}</Text>
                <Text style={styles.subText}>{user.email}</Text>
            </View>

            <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Current Status:</Text>
                <Text style={[styles.statusValue, status === 'IN' ? styles.green : styles.red]}>
                    {status === 'IN' ? 'CLOCKED IN' : 'CLOCKED OUT'}
                </Text>
            </View>

            <View style={styles.actionContainer}>
                {status === 'OUT' ? (
                    <TouchableOpacity
                        style={[styles.bigButton, styles.bgGreen]}
                        onPress={handleClockIn}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigButtonText}>CLOCK IN</Text>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.bigButton, styles.bgRed]}
                        onPress={handleClockOut}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigButtonText}>CLOCK OUT</Text>}
                    </TouchableOpacity>
                )}
            </View>

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
        paddingTop: 50,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 30,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subText: {
        fontSize: 16,
        color: '#666',
    },
    statusContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 40,
        elevation: 2,
    },
    statusLabel: {
        fontSize: 16,
        color: '#999',
        marginBottom: 5,
    },
    statusValue: {
        fontSize: 28,
        fontWeight: '900',
    },
    green: { color: '#28a745' },
    red: { color: '#dc3545' },
    bgGreen: { backgroundColor: '#28a745' },
    bgRed: { backgroundColor: '#dc3545' },
    actionContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    bigButton: {
        width: 250,
        height: 250,
        borderRadius: 125,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    bigButtonText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    logoutButton: {
        marginTop: 'auto',
        padding: 15,
        alignItems: 'center',
    },
    logoutText: {
        color: '#007bff',
        fontSize: 16,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 10,
    }
});
