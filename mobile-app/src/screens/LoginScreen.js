import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { login, logActivity } from '../services/api';
import * as Location from 'expo-location';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            let user;
            try {
                // First try as Employee
                user = await login(email, password, 'employee');
            } catch (err) {
                // If failed, try as Company Admin
                user = await login(email, password, 'company_admin');
            }

            // Check if user is allowed (Sales Employee OR Company Admin)
            if (user.employeeType === 'sales' || user.role === 'admin') {
                await AsyncStorage.setItem('user', JSON.stringify(user));

                // Log Login Activity with Location
                try {
                    let locData = null;
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({});
                        locData = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    }
                    await logActivity({ ...user, empId: user.empId || user.id }, 'LOGIN', 'Mobile App Login', locData);
                } catch (e) { console.log('Login Log Error', e); }

                navigation.replace('MainApp');
            } else {
                Alert.alert('Access Denied', 'This app is only for Sales Employees or Company Admins.');
            }
        } catch (error) {
            console.log(error);
            Alert.alert('Login Failed', 'Invalid credentials or access denied.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.container}
        >
            <StatusBar style="light" />
            <View style={styles.glassCard}>
                <View style={styles.headerContainer}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Sales & Marketing</Text>
                    <Text style={styles.subtitle}>Portal</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="sales@company.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Text style={{ color: '#666', fontSize: 12 }}>{showPassword ? 'Hide' : 'Show'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassCard: {
        width: '90%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 24,
        padding: 30,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        alignItems: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoImage: {
        width: 100,
        height: 100,
        marginBottom: 15,
        borderRadius: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        letterSpacing: 1,
    },
    inputContainer: {
        marginBottom: 20,
        width: '100%',
    },
    label: {
        fontSize: 14,
        color: '#444',
        marginBottom: 8,
        fontWeight: '600',
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e1e1e1',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e1e1e1',
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 10,
    },
    button: {
        backgroundColor: '#3b5998',
        width: '100%',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
