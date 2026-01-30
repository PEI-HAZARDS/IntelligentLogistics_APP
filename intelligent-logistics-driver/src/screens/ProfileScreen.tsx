/**
 * Profile Screen
 * Shows driver info and logout option
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { haptics } from '../components/AnimatedComponents';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        haptics.medium();
        logout();
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={styles.header} entering={FadeIn.duration(400)}>
                <Text style={styles.title}>Profile</Text>
            </Animated.View>

            <Animated.View style={styles.content} entering={FadeInDown.delay(200).duration(400)}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={48} color={colors.text.muted} />
                    </View>
                </View>

                {/* Driver Info */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={20} color={colors.text.muted} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Name</Text>
                            <Text style={styles.infoValue}>{user?.name || 'N/A'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="card-outline" size={20} color={colors.text.muted} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Driver's License</Text>
                            <Text style={styles.infoValue}>{user?.drivers_license || 'N/A'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={20} color={colors.text.muted} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Company</Text>
                            <Text style={styles.infoValue}>{user?.company_name || 'N/A'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={20} color={colors.text.muted} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Company Tax ID</Text>
                            <Text style={styles.infoValue}>{user?.company_nif || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.dark,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text.primary,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.background.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.border.light,
    },
    infoCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.md,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: fontSize.xs,
        color: colors.text.muted,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: fontSize.md,
        color: colors.text.primary,
        fontWeight: fontWeight.medium,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border.light,
        marginVertical: spacing.xs,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    logoutText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.error,
    },
});
