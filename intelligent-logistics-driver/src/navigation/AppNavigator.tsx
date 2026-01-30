/**
 * Navigation configuration for the Driver app
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../theme/colors';

// Screens
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';

// Tab Navigator for authenticated users
import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
    Loading: undefined;
    Login: undefined;
    Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { isAuthenticated, isLoading } = useAuthStore();

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background.dark },
                    animation: 'fade',
                }}
            >
                {isLoading ? (
                    <Stack.Screen name="Loading" component={LoadingScreen} />
                ) : !isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

