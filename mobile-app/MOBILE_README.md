# Sales & Marketing Mobile App - Setup Guide

This folder contains a **React Native (Expo)** application designed for the Sales team. It connects to your existing HRMS backend.

## 🚀 One-Time Setup

1.  **Navigate to the mobile app folder**:
    ```bash
    cd mobile-app
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Find Your Computer's IP Address**:
    - Open a new terminal.
    - Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
    - Look for your IPv4 Address (e.g., `192.168.1.5`).

4.  **Update API Configuration**:
    - Open `mobile-app/src/services/api.js`.
    - Replace the `BASE_URL` with your computer's IP address:
      ```javascript
      // Example
      const BASE_URL = 'http://192.168.1.5:5000/api';
      ```
    > **Why?** Your phone cannot access `localhost` because `localhost` refers to the phone itself. It needs to reach your computer on the local network.

## 📱 Running the App

1.  **Start the Expo Server**:
    ```bash
    npx expo start
    ```

2.  **Run on Your Phone**:
    - Download **Expo Go** from the App Store (iOS) or Google Play (Android).
    - Scan the **QR Code** shown in the terminal.
    - The app will load on your phone!

## 🧪 Testing

1.  **Login**: Use a Sales Employee account (you can create one in the Web Portal if needed).
2.  **Permissions**: Allow Location access when prompted.
3.  **Clock In**: Tap the big green button.
    - *Check the Web Portal (Activity Reports) to see the punch instantly!*
