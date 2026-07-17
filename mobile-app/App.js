import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SalesDashboard from './src/screens/SalesDashboard';
import LeadsScreen from './src/screens/LeadsScreen';
import VisitsScreen from './src/screens/VisitsScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CheckInSuccessScreen from './src/screens/CheckInSuccessScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for Authenticated Users
function AppTabs({ route }) {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Leads') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Visits') {
                        iconName = focused ? 'location' : 'location-outline';
                    } else if (route.name === 'Tasks') {
                        iconName = focused ? 'checkbox' : 'checkbox-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#007bff',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="Home" component={SalesDashboard} options={{ title: 'Dashboard' }} />
            <Tab.Screen name="Tasks" component={TasksScreen} />
            <Tab.Screen name="Visits" component={VisitsScreen} />
            <Tab.Screen name="Leads" component={LeadsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="Login">
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="MainApp"
                        component={AppTabs}
                        options={{ headerShown: false, gestureEnabled: false }}
                    />
                    <Stack.Screen
                        name="CheckInSuccess"
                        component={CheckInSuccessScreen}
                        options={{ headerShown: false, gestureEnabled: false }}
                    />
                </Stack.Navigator>
                <StatusBar style="auto" />
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}
