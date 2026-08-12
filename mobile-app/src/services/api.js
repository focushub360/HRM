import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

import { API_URL } from '../config';

const BASE_URL = API_URL;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Interceptor to log full URL on error for easier debugging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error(`API Error [${error.config?.url}]:`, error.message, 'BaseURL:', BASE_URL);
        return Promise.reject(error);
    }
);

export const login = async (email, password, type = 'employee') => {
    try {
        const response = await api.post('/auth/login', {
            type,
            email,
            password,
        });
        return response.data; // Returns user object
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        throw error;
    }
};

export const updateProfile = async (user, updateData) => {
    try {
        let endpoint = '';
        if (user.type === 'company' || user.role === 'admin') {
            endpoint = `/companies/${user.companyId}/admin`;
        } else {
            // Employee (expects numeric ID)
            endpoint = `/companies/${user.companyId}/employees/${user.id}`;
        }

        const response = await api.put(endpoint, updateData);
        return response.data;
    } catch (error) {
        console.error('Update Profile Error:', error);
        throw error;
    }
};

export const logActivity = async (userData, action, details, location, address = null, extraData = {}) => {
    try {
        const payload = {
            userId: userData.empId,
            companyId: userData.companyId,
            action,
            details,
            latitude: location?.coords?.latitude,
            longitude: location?.coords?.longitude,
            address: address,
            userName: userData.name,
            employeeType: userData.employeeType,
            ...extraData // Spread extra data (like selfie images)
        };

        await api.post('/activities', payload);
    } catch (error) {
        console.error('Log Activity Error:', error);
    }
};

export default api;
