/**
 * Login Screen for Driver App
 * Adapted from web version Login.tsx
 * Enhanced with animations and haptic feedback.
 *
 * The login card sits on the same animated blue background used by the web
 * gate-operator / manager apps (Login.css): a diagonal blue gradient with a
 * dark overlay and slowly drifting orbs. The card itself is a white card with
 * light inputs (matching the web login), fixed regardless of the in-app
 * light/dark theme (there is no theme toggle pre-login).
 */
import React, { useEffect, useState } from 'react';
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
    ViewStyle,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../services/drivers';
import { useAuthStore } from '../stores/authStore';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { haptics } from '../components/AnimatedComponents';
import type { UserInfo } from '../types/types';

/* -------------------------------------------------------------------------- */
/* Animated blue background (mirrors web Login.css)                            */
/* -------------------------------------------------------------------------- */

interface OrbProps {
    size: number;
    color: string;
    duration: number;
    reverse?: boolean;
    style: ViewStyle;
}

/** A large, faint circle that drifts slowly — ambient motion behind the card. */
function FloatingOrb({ size, color, duration, reverse, style }: OrbProps) {
    const t = useSharedValue(0);

    useEffect(() => {
        t.value = withRepeat(
            withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
            -1,
            true,
        );
    }, [duration, t]);

    const animatedStyle = useAnimatedStyle(() => {
        const p = reverse ? 1 - t.value : t.value;
        // Approximates the web orb-float keyframes (drift + gentle scale).
        return {
            transform: [
                { translateX: -10 + p * 40 },
                { translateY: 20 - p * 60 },
                { scale: 1 + p * 0.05 },
            ],
        };
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.orb,
                { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
                style,
                animatedStyle,
            ]}
        />
    );
}

function LoginBackground() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
                colors={['#0c4a6e', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.bgOverlay} />
            <FloatingOrb size={500} color="#38bdf8" duration={20000} style={{ top: -120, left: -100 }} />
            <FloatingOrb size={400} color="#0ea5e9" duration={28000} reverse style={{ bottom: -80, right: -80 }} />
            <FloatingOrb size={300} color="#7dd3fc" duration={22000} style={{ top: '45%', left: '55%' }} />
        </View>
    );
}

/* -------------------------------------------------------------------------- */
/* Login screen                                                                */
/* -------------------------------------------------------------------------- */

export default function LoginScreen() {
    const [driversLicense, setDriversLicense] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
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
                drivers_license: response.user_info.drivers_license,
                name: response.user_info.name,
                company_nif: response.user_info.company_nif,
                company_name: response.user_info.company_name,
                role: 'driver',
            };

            setSuccess(true);
            haptics.success();
            // Brief success display before the auth store triggers navigation
            await new Promise(resolve => setTimeout(resolve, 900));
            await authLogin(response.access_token, response.refresh_token, userInfo);
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
        <View style={styles.container}>
            <LoginBackground />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.flex}
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

                        {/* Success Message */}
                        {success && (
                            <Animated.View style={styles.successContainer} entering={FadeInDown.duration(300).springify()}>
                                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                                <Text style={styles.successText}>Login successful! Redirecting…</Text>
                            </Animated.View>
                        )}

                        {/* Error Message - Animated */}
                        {error && !success && (
                            <Animated.View style={styles.errorContainer} entering={FadeInDown.duration(300).springify()}>
                                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </Animated.View>
                        )}

                        {/* Form - Animated */}
                        <Animated.View style={styles.form} entering={FadeInUp.delay(600).duration(500)}>
                            {/* Driver's License Input */}
                            <View style={styles.inputGroup}>
                                <View style={styles.inputIcon}>
                                    <Ionicons name="card-outline" size={20} color="#64748b" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Driver's License"
                                    placeholderTextColor="#64748b"
                                    value={driversLicense}
                                    onChangeText={setDriversLicense}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    editable={!isLoading && !success}
                                />
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputGroup}>
                                <View style={styles.inputIcon}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#64748b"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!isLoading && !success}
                                />
                                <TouchableOpacity
                                    style={styles.togglePassword}
                                    onPress={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color="#64748b"
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleLoginPress}
                                disabled={isLoading || success}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={success ? ['#15803d', '#166534'] : ['#0277BD', '#01579B']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[
                                        styles.loginButton,
                                        (isLoading || success) && !success && styles.loginButtonDisabled,
                                    ]}
                                >
                                    {success ? (
                                        <View style={styles.loadingContainer}>
                                            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                                            <Text style={styles.loginButtonText}>Redirecting…</Text>
                                        </View>
                                    ) : isLoading ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color="#ffffff" />
                                            <Text style={styles.loginButtonText}>Logging in...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.loginButtonText}>LOGIN</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                        </Animated.View>

                        {/* Footer */}
                        <Text style={styles.footer}>© 2025 Port Logistics Management System</Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

/**
 * Fixed dark-glass-on-blue styling, matching the web login (Login.css). These
 * colors are intentionally not theme-reactive so the entry screen looks the
 * same across the driver, gate-operator and manager apps.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0c4a6e', // gradient fallback
    },
    flex: {
        flex: 1,
    },
    // --- animated background ---
    bgOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    orb: {
        position: 'absolute',
        opacity: 0.12,
    },
    // --- card ---
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: borderRadius.xl,
        padding: spacing.xxl,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.25,
        shadowRadius: 50,
        elevation: 12,
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
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.35)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    successText: {
        flex: 1,
        color: '#16a34a',
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    errorText: {
        flex: 1,
        color: '#dc2626',
        fontSize: fontSize.sm,
    },
    form: {
        gap: spacing.md,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: 'rgba(148, 163, 184, 0.4)',
        borderRadius: 50,
    },
    inputIcon: {
        paddingHorizontal: spacing.md,
    },
    input: {
        flex: 1,
        height: 50,
        color: '#0f172a',
        fontSize: fontSize.lg,
    },
    togglePassword: {
        paddingHorizontal: spacing.md,
    },
    loginButton: {
        borderRadius: borderRadius.md,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#ffffff',
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
        color: '#94a3b8',
        fontSize: fontSize.xs,
    },
});
