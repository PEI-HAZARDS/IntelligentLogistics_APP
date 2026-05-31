import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../theme/ThemeContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';
import LocationConsentScreen, { LOCATION_CONSENT_KEY } from '../screens/LocationConsentScreen';

// Drawer Navigator for authenticated users
import MainDrawerNavigator from './MainDrawerNavigator';

export type RootStackParamList = {
    Loading: undefined;
    Login: undefined;
    LocationConsent: undefined;
    Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { isAuthenticated, isLoading } = useAuthStore();
    const { colors } = useTheme();
    const [consentChecked, setConsentChecked] = useState(false);
    const [hasConsent, setHasConsent] = useState<boolean | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            // Reset consent check state on logout so it re-runs on next login.
            setConsentChecked(false);
            setHasConsent(null);
            return;
        }
        AsyncStorage.getItem(LOCATION_CONSENT_KEY).then((value) => {
            setHasConsent(value !== null); // null means never answered
            setConsentChecked(true);
        });
    }, [isAuthenticated]);

    const resolveScreen = () => {
        if (isLoading || (isAuthenticated && !consentChecked)) {
            return <Stack.Screen name="Loading" component={LoadingScreen} />;
        }
        if (!isAuthenticated) {
            return <Stack.Screen name="Login" component={LoginScreen} />;
        }
        if (!hasConsent) {
            return (
                <Stack.Screen name="LocationConsent">
                    {() => (
                        <LocationConsentScreen
                            onConsent={() => setHasConsent(true)}
                            onDecline={() => setHasConsent(true)}
                        />
                    )}
                </Stack.Screen>
            );
        }
        return <Stack.Screen name="Main" component={MainDrawerNavigator} />;
    };

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background.dark },
                    animation: 'fade',
                }}
            >
                {resolveScreen()}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
