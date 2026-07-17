import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { updateProfile, logActivity } from '../services/api';

const ProfileScreen = () => {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        phone: '',
        designation: '',
        street: '',
        city: '',
        state: ''
    });
    const [avatar, setAvatar] = useState(null); // Base64 or URL

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setAvatar(parsed.profileImage);

            // Populate Form safely
            setForm({
                phone: parsed.phone || '',
                designation: parsed.position || parsed.designation || '',
                street: parsed.address?.street || '',
                city: parsed.address?.city || '',
                state: parsed.address?.state || ''
            });
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Gallery permission is required to change photo.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const updatePayload = {
                phone: form.phone,
                // Construct address object matching backend schema
                address: {
                    street: form.street,
                    city: form.city,
                    state: form.state,
                    country: user.address?.country || 'India', // Preserve or default
                    postalCode: user.address?.postalCode || ''
                }
            };

            // Only send image if changed (simple check: if avatar starts with data:)
            if (avatar && avatar.startsWith('data:')) {
                updatePayload.profileImage = avatar;
            }

            const updatedUser = await updateProfile(user, updatePayload);

            // Merge response with current local user to ensure complete object
            // (Backend sometimes returns incomplete object or just updated fields? 
            // updateProfile in api returns response.data. database.js returns updatedFull. So it should be full.)
            const fullUser = { ...user, ...updatedUser };

            // If image was updated locally but backend returned URL (or not), ensure consistency
            if (avatar && avatar.startsWith('data:')) {
                fullUser.profileImage = avatar; // Keep local base64 until refresh to avoid flicker
            }

            await AsyncStorage.setItem('user', JSON.stringify(fullUser));
            setUser(fullUser);
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            // Log Logout Activity
            try {
                let locData = null;
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    locData = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                }
                await logActivity({ ...user, empId: user.empId || user.id }, 'LOGOUT', 'User Logged Out', locData);
            } catch (e) { console.log('Logout Log Error', e); }

            await AsyncStorage.removeItem('user');
            // Check if Check-In state exists and warn? checking out usually better.
            // For now just logout.
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header */}
                <LinearGradient
                    colors={['#4c669f', '#3b5998', '#192f6a']}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>My Profile</Text>
                    </View>
                </LinearGradient>

                {/* Profile Card */}
                <View style={styles.cardContainer}>
                    <View style={styles.card}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrapper}>
                                {avatar ? (
                                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
                                    </View>
                                )}
                                <View style={styles.editBadge}>
                                    <Ionicons name="camera" size={16} color="white" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Basic Info */}
                        <Text style={styles.name}>{user?.name || 'User Name'}</Text>
                        <Text style={styles.email}>{user?.email || 'email@company.com'}</Text>
                        <Text style={styles.role}>{user?.employeeType ? user.employeeType.toUpperCase() : 'EMPLOYEE'}</Text>

                        <View style={styles.divider} />

                        {/* Editable Form */}
                        <View style={styles.formContainer}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={form.phone}
                                onChangeText={(t) => setForm({ ...form, phone: t })}
                                placeholder="+91 99999 99999"
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.label}>Street Address</Text>
                            <TextInput
                                style={styles.input}
                                value={form.street}
                                onChangeText={(t) => setForm({ ...form, street: t })}
                                placeholder="123 Main St"
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>City</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.city}
                                        onChangeText={(t) => setForm({ ...form, city: t })}
                                        placeholder="City"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>State</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.state}
                                        onChangeText={(t) => setForm({ ...form, state: t })}
                                        placeholder="State"
                                    />
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Additional Options */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                        <View style={styles.menuIconRed}>
                            <Ionicons name="log-out-outline" size={24} color="#dc3545" />
                        </View>
                        <Text style={styles.menuTextRed}>Sign Out</Text>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    header: { height: 180, paddingTop: 50, alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    cardContainer: { paddingHorizontal: 20, marginTop: -60 },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 20, paddingTop: 50, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    avatarContainer: { position: 'absolute', top: -50, alignSelf: 'center' },
    avatarWrapper: { elevation: 10 },
    avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: 'white' },
    avatarPlaceholder: { backgroundColor: '#3b5998', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007bff', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 5 },
    email: { fontSize: 14, color: '#666', marginBottom: 5 },
    role: { fontSize: 12, color: '#007bff', fontWeight: 'bold', backgroundColor: '#e7f1ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 20 },
    divider: { height: 1, backgroundColor: '#eee', width: '100%', marginBottom: 20 },
    formContainer: { width: '100%' },
    label: { fontSize: 13, color: '#555', marginBottom: 5, fontWeight: '600', marginLeft: 5 },
    input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 12, padding: 12, marginBottom: 15, fontSize: 16, color: '#333' },
    row: { flexDirection: 'row' },
    saveButton: { backgroundColor: '#3b5998', width: '100%', padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 10, shadowColor: '#3b5998', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
    saveText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    menuContainer: { marginTop: 25, paddingHorizontal: 20 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 },
    menuIconRed: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#ffebee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextRed: { flex: 1, fontSize: 16, color: '#dc3545', fontWeight: '600' }
});

export default ProfileScreen;
