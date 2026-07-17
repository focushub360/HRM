import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Dimensions, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../services/api';

const VisitsScreen = () => {
    const [note, setNote] = useState('');
    const [history, setHistory] = useState([]);
    const [user, setUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentLoc, setCurrentLoc] = useState(null);
    const [visitImage, setVisitImage] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = React.useRef(null);
    const [permission, requestPermission] = useCameraPermissions();

    // Leads State removed as per request
    const [clientName, setClientName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
        };
        getUser();

        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let loc = await Location.getCurrentPositionAsync({});
                    setCurrentLoc(loc.coords);
                }
            } catch (e) { }
        })();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (user) {
                fetchVisits();
            }
        }, [user])
    );

    // fetchLeads removed as per request

    const fetchVisits = async () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const response = await api.get(`/visits/${user.companyId}`);
            const myVisits = response.data
                .filter(v => v.userId === user.empId && v.timestamp.slice(0, 10) === today)
                .reverse();

            // Save to mobile for offline/day-wise viewing
            await AsyncStorage.setItem(`visits_${user.empId}_${today}`, JSON.stringify(myVisits));
            setHistory(myVisits);

            // Reset/Cleanup old visit logs from mobile
            cleanupOldVisits(today);
        } catch (error) {
            console.error('Fetch Visits Error:', error);
            // Fallback to local storage if offline
            const today = new Date().toISOString().split('T')[0];
            const localData = await AsyncStorage.getItem(`visits_${user.empId}_${today}`);
            if (localData) {
                setHistory(JSON.parse(localData));
            }
        }
    };

    const cleanupOldVisits = async (todayISO) => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const visitKeys = keys.filter(k => k.startsWith(`visits_${user.empId}_`));
            for (const key of visitKeys) {
                if (!key.endsWith(todayISO)) {
                    await AsyncStorage.removeItem(key);
                }
            }
        } catch (e) { }
    };

    const takeSelfie = async () => {
        if (!permission) {
            const status = await requestPermission();
            if (!status.granted) return Alert.alert('Permission Denied', 'Camera permission is needed.');
        }
        setShowCamera(true);
    };

    const capturePhoto = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.3
                });
                setVisitImage(photo.base64);
                setShowCamera(false);
            } catch (e) {
                Alert.alert("Error", "Failed to capture photo");
            }
        }
    };

    const handleLogVisit = async () => {
        if (!note.trim()) {
            return Alert.alert('Error', 'Please enter a note');
        }
        if (!visitImage) {
            return Alert.alert('Photo Required', 'Please take a selfie to verify visit.');
        }

        if (submitting) return;

        try {
            setSubmitting(true);
            let locPayload = {};
            let addressStr = '';
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status === 'granted') {
                // High accuracy GPS
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Highest
                });

                locPayload = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                };

                // Reverse Geocode for Address
                try {
                    const geo = await Location.reverseGeocodeAsync(loc.coords);
                    if (geo.length > 0) {
                        const place = geo[0];
                        addressStr = `${place.name || ''} ${place.street || ''}, ${place.city || ''}, ${place.region || ''}`.trim();
                    }
                } catch (e) { console.log("Geocode failed", e); }
            }

            const payload = {
                companyId: user.companyId,
                userId: user.empId,
                userName: user.name,
                notes: note,
                clientName: clientName || 'Field Visit',
                address: addressStr,
                image: `data:image/jpeg;base64,${visitImage}`,
                ...locPayload
            };

            const response = await api.post('/visits', payload);
            const savedVisit = response.data;

            // Update local storage immediately for real-time offline-ready feel
            const today = new Date().toISOString().split('T')[0];
            const newHistory = [savedVisit, ...history];
            await AsyncStorage.setItem(`visits_${user.empId}_${today}`, JSON.stringify(newHistory));

            Alert.alert('Success', 'Visit logged successfully');
            setNote('');
            setClientName('');
            setVisitImage(null);
            setModalVisible(false);
            fetchVisits();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to log visit');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteVisit = async (visitId) => {
        if (!visitId) return;
        Alert.alert(
            'Delete Visit',
            'Are you sure you want to delete this visit log?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/visits/${visitId}`);
                            setHistory(prev => prev.filter(v => v.id !== visitId));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete visit');
                        }
                    }
                }
            ]
        );
    };

    const getMapHtml = () => {
        const markers = history
            .filter(v => v.latitude && v.longitude)
            .map(v => `L.marker([${v.latitude}, ${v.longitude}]).addTo(map).bindPopup('<b>${v.clientName}</b><br>${v.notes}');`)
            .join('\n');

        const lat = currentLoc ? currentLoc.latitude : (history[0]?.latitude || 20.5937);
        const lng = currentLoc ? currentLoc.longitude : (history[0]?.longitude || 78.9629);
        const polyCoords = history.filter(v => v.latitude && v.longitude).map(v => `[${v.latitude}, ${v.longitude}]`);
        const polyline = polyCoords.length > 1 ? `L.polyline([${polyCoords.join(',')}], {color: 'blue'}).addTo(map);` : '';

        return `
            <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script><style>body { margin: 0; padding: 0; } #map { height: 100vh; width: 100%; }</style></head><body><div id="map"></div><script>var map = L.map('map').setView([${lat}, ${lng}], 13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap'}).addTo(map);${markers}${polyline}${currentLoc ? `L.circleMarker([${currentLoc.latitude}, ${currentLoc.longitude}], {color: 'red', radius: 8}).addTo(map);` : ''}</script></body></html>
        `;
    };

    return (
        <View style={styles.container}>
            <View style={styles.mapContainer}>
                <WebView originWhitelist={['*']} source={{ html: getMapHtml() }} style={{ flex: 1 }} />
            </View>

            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.historyTitle}>Today's Timeline</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Text style={styles.addButtonText}>+ Log Visit</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollList}>
                    {history.map((visit, index) => (
                        <View key={visit.id || index} style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                                <View style={styles.line} />
                                <View style={styles.dot} />
                            </View>
                            <View style={styles.timelineContent}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.time}>{new Date(visit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    <TouchableOpacity onPress={() => handleDeleteVisit(visit.id)}>
                                        <Ionicons name="trash-outline" size={18} color="#dc3545" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.client}>{visit.clientName}</Text>
                                <Text style={styles.notes}>{visit.notes}</Text>
                            </View>
                        </View>
                    ))}
                    {history.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No visits yet.</Text>}
                </ScrollView>
            </View>

            {/* Log Visit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Visit</Text>

                        <TextInput
                            style={styles.textArea}
                            multiline
                            numberOfLines={3}
                            placeholder="Visit notes..."
                            value={note}
                            onChangeText={setNote}
                        />

                        <Text style={styles.label}>Client / Center Name:</Text>
                        <TextInput
                            style={styles.inputSimple}
                            placeholder="Enter Client Name..."
                            value={clientName}
                            onChangeText={setClientName}
                        />

                        {showCamera ? (
                            <View style={styles.halfWindowCamera}>
                                <CameraView
                                    ref={cameraRef}
                                    style={StyleSheet.absoluteFillObject}
                                    facing="front"
                                />
                                <View style={styles.captureOverlay}>
                                    <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
                                        <Ionicons name="camera" size={32} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setShowCamera(false)}>
                                        <Ionicons name="close-circle" size={32} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.cameraButton} onPress={takeSelfie}>
                                <Ionicons name="camera" size={20} color="white" style={{ marginRight: 10 }} />
                                <Text style={styles.cameraButtonText}>{visitImage ? 'Retake Photo' : 'Take Visit Photo / Selfie'}</Text>
                            </TouchableOpacity>
                        )}
                        {visitImage && !showCamera && <Text style={styles.imageSuccess}>✓ Photo Captured</Text>}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.saveBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleLogVisit}
                                disabled={submitting}
                            >
                                <Text style={[styles.btnText, { color: 'white' }]}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Lead Selection Modal Removed */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    mapContainer: { height: Dimensions.get('window').height * 0.45, width: '100%' },
    listContainer: { flex: 1, backgroundColor: '#f8f9fa', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -15, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    addButton: { backgroundColor: '#007bff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    scrollList: { paddingBottom: 20 },
    timelineItem: { flexDirection: 'row', marginBottom: 20 },
    timelineLeft: { alignItems: 'center', marginRight: 15, width: 20 },
    line: { position: 'absolute', top: 0, bottom: -20, width: 2, backgroundColor: '#ddd', zIndex: 0 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007bff', zIndex: 1, marginTop: 5 },
    timelineContent: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2 },
    time: { fontSize: 12, color: '#999', marginBottom: 5 },
    client: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    notes: { fontSize: 14, color: '#666', marginTop: 5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5 },
    pickerContent: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, marginTop: 'auto', elevation: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, height: 80, textAlignVertical: 'top', marginBottom: 15 },
    cameraButton: { backgroundColor: '#6f42c1', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 5 },
    cameraButtonText: { color: 'white', fontWeight: 'bold' },
    halfWindowCamera: { height: 250, width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 15, backgroundColor: '#000' },
    cameraPreview: { flex: 1 },
    captureOverlay: { flex: 1, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 20 },
    captureBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
    closeCameraBtn: { position: 'absolute', top: 10, right: 10 },
    imageSuccess: { color: 'green', textAlign: 'center', marginBottom: 15, fontSize: 12 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    modalBtn: { width: '48%', padding: 12, borderRadius: 10, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#eee' },
    saveBtn: { backgroundColor: '#007bff' },
    btnText: { fontWeight: 'bold' },

    label: { fontSize: 13, color: '#666', marginBottom: 5, fontWeight: 'bold' },
    inputSimple: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16, color: '#333', backgroundColor: '#f9f9f9' },
    selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 15, backgroundColor: '#f9f9f9' },
    selectorText: { fontSize: 16, color: '#333' },
    leadItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
    leadName: { fontSize: 16, marginLeft: 10 },
    avatarPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center' }
});

export default VisitsScreen;
