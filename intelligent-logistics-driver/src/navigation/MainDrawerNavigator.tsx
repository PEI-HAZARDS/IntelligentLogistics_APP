/**
 * Main Drawer Navigator for Driver App
 * Replaces bottom tabs with a side drawer and top header
 */
import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

// Screens
import ActiveArrivalScreen from '../screens/ActiveArrivalScreen';
import ArrivalsScreen from '../screens/ArrivalsScreen';
import AvailableBookingsScreen from '../screens/AvailableBookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type MainDrawerParamList = {
    Home: undefined;
    Arrivals: undefined;
    AvailableBookings: undefined;
    Profile: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParamList>();

// Custom Header Right component (Profile icon)
const HeaderRight = () => {
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    return (
        <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
        >
            <Ionicons name="person-circle-outline" size={28} color={colors.text.primary} />
        </TouchableOpacity>
    );
};

export default function MainDrawerNavigator() {
    const { colors } = useTheme();
    return (
        <Drawer.Navigator
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.background.dark,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.light,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTitle: '',
                headerTintColor: colors.primary,
                drawerStyle: {
                    backgroundColor: colors.background.dark,
                    width: 280,
                },
                drawerActiveTintColor: colors.primary,
                drawerInactiveTintColor: colors.text.muted,
                drawerLabelStyle: {
                    fontSize: 16,
                    fontWeight: '600',
                },
            }}
        >
            <Drawer.Screen
                name="Home"
                component={ActiveArrivalScreen}
                options={{
                    title: 'Delivery',
                    headerRight: () => <HeaderRight />,
                    drawerIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="Arrivals"
                component={ArrivalsScreen}
                options={{
                    title: 'Schedule',
                    headerRight: () => <HeaderRight />,
                    drawerIcon: ({ color, size }) => (
                        <Ionicons name="list" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="AvailableBookings"
                component={AvailableBookingsScreen}
                options={{
                    title: 'Available Bookings',
                    headerRight: () => <HeaderRight />,
                    drawerIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />
            {/* Hidden from drawer list but accessible via header icon */}
            <Drawer.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    drawerItemStyle: { display: 'none' },
                    title: 'My Profile',
                    // When on profile, we don't need the profile icon again
                    headerRight: () => null,
                }}
            />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    profileButton: {
        marginRight: spacing.md,
        padding: 4,
    },
});
