import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const LeadsScreen = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [responseModal, setResponseModal] = useState({ visible: false, leadId: null, query: '', currentResponse: '' });

    useEffect(() => {
        const getUser = async () => {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        };
        getUser();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (user) {
                fetchLeads();
            }
        }, [user])
    );

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/leads?companyId=${user.companyId}`);
            setLeads(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    };

    // Lead Form State
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newContact, setNewContact] = useState('');
    const [newEmail, setNewEmail] = useState('');

    const handleAddLead = () => {
        setModalVisible(true);
    };

    const submitLead = async () => {
        if (!newName || !newContact) {
            Alert.alert('Error', 'Name and Contact are required');
            return;
        }
        try {
            await api.post('/leads', {
                companyId: user.companyId,
                name: newName,
                contactPerson: newContact,
                email: newEmail,
                addedBy: user.empId
            });
            Alert.alert('Success', 'Lead added successfully');
            setModalVisible(false);
            setNewName('');
            setNewContact('');
            setNewEmail('');
            fetchLeads();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to add lead');
        }
    };

    const respondToQuery = async () => {
        if (!responseModal.currentResponse.trim()) return Alert.alert('Error', 'Please enter a response');
        try {
            await api.put(`/leads/${responseModal.leadId}`, {
                response: responseModal.currentResponse,
                companyId: user.companyId
            });
            setResponseModal({ ...responseModal, visible: false });
            fetchLeads();
            Alert.alert('Success', 'Response sent to HR');
        } catch (error) {
            Alert.alert('Error', 'Failed to send response');
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.contact}>{item.contactPerson}</Text>
                </View>
                <View style={[styles.badge, item.status === 'New' ? styles.badgeNew : styles.badgeProgress]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>

            {item.query && (
                <View style={styles.queryBox}>
                    <View style={styles.queryHeader}>
                        <Ionicons name="help-circle" size={16} color="#f59e0b" />
                        <Text style={styles.queryTitle}>HR QUERY</Text>
                    </View>
                    <Text style={styles.queryText}>"{item.query}"</Text>

                    {item.response ? (
                        <View style={styles.responseBox}>
                            <Text style={styles.responseText}><Text style={{ fontWeight: 'bold' }}>You: </Text>{item.response}</Text>
                            <TouchableOpacity onPress={() => setResponseModal({ visible: true, leadId: item.id, query: item.query, currentResponse: item.response })}>
                                <Text style={styles.editBtn}>Edit Answer</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.answerBtn}
                            onPress={() => setResponseModal({ visible: true, leadId: item.id, query: item.query, currentResponse: '' })}
                        >
                            <Text style={styles.answerBtnText}>Answer Now</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <View style={styles.cardFooter}>
                <Ionicons name="mail-outline" size={14} color="#999" />
                <Text style={styles.email}> {item.email || 'No email'}</Text>
            </View>
        </View>
    );

    if (loading && !leads.length) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Leads</Text>
                <Text style={styles.headerSub}>Manage your potential clients</Text>
            </View>

            <FlatList
                data={leads}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>No leads found.</Text>}
            />

            {/* Answer Query Modal */}
            <Modal visible={responseModal.visible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Respond to HR</Text>
                        <Text style={styles.modalLabel}>The Query:</Text>
                        <View style={styles.modalQueryDisplay}>
                            <Text style={styles.queryText}>"{responseModal.query}"</Text>
                        </View>

                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Type your answer here..."
                            multiline
                            value={responseModal.currentResponse}
                            onChangeText={(t) => setResponseModal({ ...responseModal, currentResponse: t })}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setResponseModal({ ...responseModal, visible: false })}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.btnConfirm]} onPress={respondToQuery}>
                                <Text style={styles.btnText}>Send Response</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Lead Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Lead</Text>
                        <TextInput style={styles.input} placeholder="Company/Lead Name" value={newName} onChangeText={setNewName} />
                        <TextInput style={styles.input} placeholder="Contact Person" value={newContact} onChangeText={setNewContact} />
                        <TextInput style={styles.input} placeholder="Email (Optional)" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.btnConfirm]} onPress={submitLead}>
                                <Text style={styles.btnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <TouchableOpacity style={styles.fab} onPress={handleAddLead}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { padding: 20, paddingTop: 55, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    headerSub: { fontSize: 13, color: '#999', marginTop: 2 },
    list: { padding: 15, paddingBottom: 100 },
    card: { backgroundColor: 'white', borderRadius: 15, marginBottom: 15, padding: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    contact: { fontSize: 14, color: '#666', marginTop: 2 },
    email: { fontSize: 12, color: '#999' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeNew: { backgroundColor: '#e7f1ff' },
    badgeProgress: { backgroundColor: '#fff7ed' },
    badgeText: { fontSize: 11, fontWeight: 'bold', color: '#007bff' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, pt: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },

    queryBox: { backgroundColor: '#fffaf0', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderLeftColor: '#f59e0b', marginVertical: 10 },
    queryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    queryTitle: { fontSize: 10, fontWeight: 'bold', color: '#f59e0b', marginLeft: 5 },
    queryText: { fontSize: 14, color: '#444', fontStyle: 'italic' },
    answerBtn: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 10, alignSelf: 'flex-start' },
    answerBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    responseBox: { marginTop: 10, backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: 10, borderRadius: 8, borderLeftWidth: 2, borderLeftColor: '#10b981' },
    responseText: { fontSize: 13, color: '#333' },
    editBtn: { fontSize: 11, color: '#007bff', fontWeight: 'bold', marginTop: 5 },

    fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#007bff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    modalLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 5 },
    modalQueryDisplay: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
    input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 12, padding: 15, marginBottom: 20, fontSize: 16, color: '#333', backgroundColor: '#fcfcfc' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    btn: { flex: 0.48, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    btnCancel: { backgroundColor: '#f1f1f1' },
    btnConfirm: { backgroundColor: '#007bff' },
    btnText: { fontWeight: 'bold', fontSize: 15, color: '#FFF' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default LeadsScreen;
