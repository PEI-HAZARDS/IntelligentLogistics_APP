/**
 * Profile Screen
 * Shows driver info and logout option
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { spacing, borderRadius, fontSize, fontWeight, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { haptics } from '../components/AnimatedComponents';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();
    const { colors, mode, toggle } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const isDark = mode === 'dark';

    const handleLogout = () => {
        haptics.medium();
        logout();
    };

    const handleThemeToggle = () => {
        haptics.light();
        toggle();
    };

    return (
        <View style={styles.container}>
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

                {/* Appearance / Theme toggle */}
                <View style={styles.settingsCard}>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleThemeToggle}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isDark ? 'moon' : 'sunny'}
                            size={20}
                            color={colors.text.muted}
                        />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Appearance</Text>
                            <Text style={styles.infoValue}>{isDark ? 'Dark' : 'Light'}</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={handleThemeToggle}
                            trackColor={{ false: colors.border.medium, true: colors.primary }}
                            thumbColor={colors.white}
                        />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
        paddingTop: spacing.md,
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
    settingsCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
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
