import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function CheckInSuccessScreen({ navigation, route }) {
    const { address, selfie } = route.params || {};
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            })
        ]).start();

        // Auto redirect
        const timer = setTimeout(() => {
            navigation.navigate('MainApp', { screen: 'Home' });
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <LinearGradient
            colors={['#198754', '#20c997']}
            style={styles.container}
        >
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.circle}>
                    <Ionicons name="checkmark-sharp" size={80} color="#198754" />
                </View>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
                <Text style={styles.title}>Check In Successful!</Text>
                <Text style={styles.subtitle}>You are now marked correctly online.</Text>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <Ionicons name="time-outline" size={24} color="#555" />
                        <Text style={styles.cardText}>{new Date().toLocaleTimeString()}</Text>
                    </View>
                    <View style={[styles.row, { marginTop: 15 }]}>
                        <Ionicons name="location-outline" size={24} color="#555" />
                        <Text style={styles.cardText} numberOfLines={2}>{address || 'Location Verified'}</Text>
                    </View>
                </View>

                <Text style={styles.footer}>Redirecting to Dashboard...</Text>
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    iconContainer: {
        marginBottom: 40,
    },
    circle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 40,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 25,
        width: '100%',
        elevation: 5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 15,
        flex: 1,
        fontWeight: '500',
    },
    footer: {
        marginTop: 40,
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
    }
});
