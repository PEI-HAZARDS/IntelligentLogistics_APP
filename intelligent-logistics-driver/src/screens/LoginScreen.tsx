/**
 * Login Screen for Driver App
 * Adapted from web version Login.tsx
 * Enhanced with animations and haptic feedback
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
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../services/drivers';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { haptics } from '../components/AnimatedComponents';
import type { UserInfo } from '../types/types';

// ===== MOCK MODE - REMOVER DEPOIS DE TESTAR =====
const DEV_MOCK_MODE = true; // Mudar para false para usar API real

const MOCK_USER: UserInfo = {
    drivers_license: 'AB-123456',
    name: 'João Silva (MOCK)',
    company_nif: '501234567',
    company_name: 'TransLogis',
    role: 'driver',
};
// ===== FIM MOCK MODE =====

export default function LoginScreen() {
    const [driversLicense, setDriversLicense] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const authLogin = useAuthStore((state) => state.login);

    // ===== MOCK LOGIN - REMOVER DEPOIS DE TESTAR =====
    const handleMockLogin = async () => {
        setIsLoading(true);
        haptics.medium();

        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 800));

        await authLogin('mock-token-for-testing', MOCK_USER);
        haptics.success();
        setIsLoading(false);
    };
    // ===== FIM MOCK LOGIN =====

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
            haptics.success();
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

    const handleLoginPress = () => {
        haptics.medium();
        handleLogin();
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
                <Animated.View style={styles.card} entering={FadeIn.duration(500)}>
                    {/* Logo - Animated Zoom In */}
                    <Animated.View style={styles.logoContainer} entering={ZoomIn.delay(200).duration(600).springify()}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    {/* Title - Fade In */}
                    <Animated.Text style={styles.title} entering={FadeInDown.delay(400).duration(400)}>
                        INTELLIGENT LOGISTICS
                    </Animated.Text>
                    <Animated.Text style={styles.subtitle} entering={FadeInDown.delay(500).duration(400)}>
                        Driver Area
                    </Animated.Text>

                    {/* Error Message - Animated */}
                    {error && (
                        <Animated.View style={styles.errorContainer} entering={FadeInDown.duration(300).springify()}>
                            <Ionicons name="alert-circle" size={18} color={colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </Animated.View>
                    )}

                    {/* Form - Animated */}
                    <Animated.View style={styles.form} entering={FadeInUp.delay(600).duration(500)}>
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

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLoginPress}
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

                        {/* ===== MOCK LOGIN BUTTON - REMOVER DEPOIS DE TESTAR ===== */}
                        {DEV_MOCK_MODE && (
                            <TouchableOpacity
                                style={[styles.loginButton, styles.mockLoginButton, isLoading && styles.loginButtonDisabled]}
                                onPress={handleMockLogin}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.loginButtonText}>ENTRAR SEM API (TESTE)</Text>
                            </TouchableOpacity>
                        )}
                        {/* ===== FIM MOCK LOGIN BUTTON ===== */}
                    </Animated.View>

                    {/* Footer */}
                    <Text style={styles.footer}>© 2025 Port Logistics Management System</Text>
                </Animated.View>
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
    // ===== MOCK STYLE - REMOVER DEPOIS DE TESTAR =====
    mockLoginButton: {
        backgroundColor: '#f97316', // Orange for visibility
        borderWidth: 2,
        borderColor: '#ea580c',
    },
    // ===== FIM MOCK STYLE =====
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
