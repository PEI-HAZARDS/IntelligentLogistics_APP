/**
 * Login Screen for Driver App
 * Adapted from web version Login.tsx
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../services/drivers';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import type { UserInfo } from '../types/types';

export default function LoginScreen() {
    const [driversLicense, setDriversLicense] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const authLogin = useAuthStore((state) => state.login);

    const handleLogin = async () => {
        if (!driversLicense.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const response = await login({
                drivers_license: driversLicense.trim(),
                password: password,
            });

            const userInfo: UserInfo = {
                drivers_license: response.drivers_license,
                name: response.name,
                company_nif: response.company_nif,
                company_name: response.company_name,
                role: 'driver',
            };

            await authLogin(response.token, userInfo);
        } catch (err: unknown) {
            console.error('Login error:', err);

            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
                if (axiosError.response?.status === 401) {
                    setError('Invalid credentials. Check your license and password.');
                } else if (axiosError.response?.status === 404) {
                    setError('Driver not found.');
                } else {
                    setError(axiosError.response?.data?.detail || 'Login failed. Please try again.');
                }
            } else {
                setError('Connection error. Please check your network.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>INTELLIGENT LOGISTICS</Text>
                    <Text style={styles.subtitle}>Driver Area</Text>

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={18} color={colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Driver's License Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.inputIcon}>
                                <Ionicons name="card-outline" size={20} color={colors.text.muted} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Driver's License"
                                placeholderTextColor={colors.text.muted}
                                value={driversLicense}
                                onChangeText={setDriversLicense}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.inputIcon}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.text.muted} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={colors.text.muted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={styles.togglePassword}
                                onPress={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye' : 'eye-off'}
                                    size={20}
                                    color={colors.text.muted}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={colors.white} />
                                    <Text style={styles.loginButtonText}>Logging in...</Text>
                                </View>
                            ) : (
                                <Text style={styles.loginButtonText}>LOGIN</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <Text style={styles.footer}>© 2025 Port Logistics Management System</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.dark,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    card: {
        backgroundColor: colors.background.medium,
        borderRadius: borderRadius.xl,
        padding: spacing.xxl,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logo: {
        width: 120,
        height: 120,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    errorText: {
        flex: 1,
        color: '#fca5a5',
        fontSize: fontSize.sm,
    },
    form: {
        gap: spacing.md,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderWidth: 1,
        borderColor: colors.border.medium,
        borderRadius: borderRadius.md,
    },
    inputIcon: {
        paddingHorizontal: spacing.md,
    },
    input: {
        flex: 1,
        height: 50,
        color: colors.text.primary,
        fontSize: fontSize.lg,
    },
    togglePassword: {
        paddingHorizontal: spacing.md,
    },
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: colors.white,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    footer: {
        marginTop: spacing.xxl,
        textAlign: 'center',
        color: colors.text.muted,
        fontSize: fontSize.xs,
    },
});
