// Mobile App API Configuration
// For React Native, usually you'd use react-native-dotenv, 
// but for now we'll stick to a simple export that can be easily updated.

// Replace 'api.focusengineering.com' with your actual AWS ALB/CloudFront domain
const PROD_API = 'https://api.focusengineering.com';
const DEV_API = 'http://10.79.29.185:5000'; // Fallback to local machine IP for emulators

export const API_URL = __DEV__ ? `${DEV_API}/api` : `${PROD_API}/api`;
export const SOCKET_URL = __DEV__ ? DEV_API : PROD_API;
