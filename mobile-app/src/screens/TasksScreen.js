import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const TasksScreen = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [replyText, setReplyText] = useState('');
    const scrollViewRef = useRef();

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
                fetchTasks();
            }
        }, [user])
    );

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/tasks/${user.companyId}`);
            // Filter: Assigned to Me OR 'all'
            const myTasks = response.data.filter(t => t.assignedTo === user.empId || t.assignedTo === 'all');
            setTasks(myTasks);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openTaskDetail = (task) => {
        setSelectedTask(task);
        setModalVisible(true);
    };

    const handleMarkComplete = async () => {
        Alert.alert('Confirm', 'Mark this task as completed?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Yes, Complete',
                onPress: async () => {
                    try {
                        await api.put(`/tasks/${selectedTask.id}`, { status: 'Completed' });
                        Alert.alert('Success', 'Task completed!');
                        setModalVisible(false);
                        fetchTasks();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to update task.');
                    }
                }
            }
        ]);
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;

        try {
            // Optimistic UI update
            const newMessage = {
                sender: user.name,
                senderId: user.empId,
                text: replyText,
                timestamp: new Date().toISOString()
            };

            const updatedMessages = [...(selectedTask.messages || []), newMessage];
            setSelectedTask({ ...selectedTask, messages: updatedMessages });

            // Assume backend supports /reply or we manage it manually via PUT
            // For now, we'll try a generic PUT to update 'messages' array
            // If backend has specific /reply endpoint, we'd use that.
            // Let's assume we simply update the task object with new messages.
            await api.put(`/tasks/${selectedTask.id}`, {
                messages: updatedMessages
            });

            setReplyText('');
            // Scroll to bottom
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

            // Background refresh
            fetchTasks();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to send message');
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openTaskDetail(item)}>
            <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, item.status === 'Completed' ? styles.badgeSuccess : styles.badgePending]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            <View style={styles.footer}>
                <Text style={styles.date}>Due: {item.dueDate || 'No Date'}</Text>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#666" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Tasks</Text>
            </View>

            <FlatList
                data={tasks}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>No tasks found.</Text>}
            />

            {/* Task Detail Modal */}
            <Modal
                animationType="slide"
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle} numberOfLines={1}>
                            {selectedTask?.title}
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            style={styles.modalBody}
                            ref={scrollViewRef}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {/* Task Info */}
                            <View style={styles.infoSection}>
                                <Text style={styles.descFull}>{selectedTask?.description}</Text>
                                <View style={styles.statusRow}>
                                    <View style={[styles.badge, selectedTask?.status === 'Completed' ? styles.badgeSuccess : styles.badgePending]}>
                                        <Text style={styles.badgeText}>{selectedTask?.status}</Text>
                                    </View>
                                    {selectedTask?.status !== 'Completed' && (
                                        <TouchableOpacity style={styles.completeBtn} onPress={handleMarkComplete}>
                                            <Text style={styles.completeBtnText}>Mark Complete</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Chat Section */}
                            <Text style={styles.sectionTitle}>Discussion</Text>
                            <View style={styles.chatContainer}>
                                {selectedTask?.messages && selectedTask.messages.length > 0 ? (
                                    selectedTask.messages.map((msg, index) => (
                                        <View key={index} style={[
                                            styles.messageBubble,
                                            msg.senderId === user?.empId ? styles.msgRight : styles.msgLeft
                                        ]}>
                                            <Text style={styles.msgUser}>{msg.sender}</Text>
                                            <Text style={styles.msgText}>{msg.text}</Text>
                                            <Text style={styles.msgTime}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noChat}>No messages yet. Reply to start discussion.</Text>
                                )}
                            </View>
                        </ScrollView>

                        {/* Reply Input */}
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.input}
                                placeholder="Write a reply..."
                                value={replyText}
                                onChangeText={setReplyText}
                            />
                            <TouchableOpacity style={styles.sendBtn} onPress={handleSendReply}>
                                <Ionicons name="send" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    list: { padding: 15 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    title: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 10 },
    description: { fontSize: 14, color: '#666', marginBottom: 10 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    date: { fontSize: 12, color: '#999' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgePending: { backgroundColor: '#fff3e0' },
    badgeSuccess: { backgroundColor: '#e8f5e9' },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: 'white' },
    modalHeader: { padding: 15, paddingTop: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', justifyContent: 'space-between' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    modalBody: { flex: 1, padding: 20 },
    infoSection: { marginBottom: 20 },
    descFull: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 15 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    completeBtn: { backgroundColor: '#28a745', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    completeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },

    // Chat
    chatContainer: { paddingBottom: 20 },
    messageBubble: { padding: 10, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
    msgLeft: { backgroundColor: '#f0f2f5', alignSelf: 'flex-start', borderBottomLeftRadius: 0 },
    msgRight: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', alignSelf: 'flex-end', borderBottomRightRadius: 0 }, // Making sure user msg is distinct
    msgUser: { fontSize: 10, color: '#999', marginBottom: 2 },
    msgText: { fontSize: 14, color: '#333' },
    msgTime: { fontSize: 10, color: '#bbb', alignSelf: 'flex-end', marginTop: 4 },
    noChat: { textAlign: 'center', color: '#ccc', fontStyle: 'italic', marginTop: 20 },

    inputArea: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center', backgroundColor: 'white' },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center' }
});

export default TasksScreen;
