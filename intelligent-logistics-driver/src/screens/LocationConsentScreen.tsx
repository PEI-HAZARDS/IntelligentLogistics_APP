import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, borderRadius, fontSize, fontWeight, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

type Styles = ReturnType<typeof createStyles>;

export const LOCATION_CONSENT_KEY = 'location_consent_given';

interface Props {
    onConsent: () => void;
    onDecline: () => void;
}

export default function LocationConsentScreen({ onConsent, onDecline }: Props) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [saving, setSaving] = useState(false);

    const handleAccept = async () => {
        setSaving(true);
        await AsyncStorage.setItem(LOCATION_CONSENT_KEY, 'true');
        onConsent();
    };

    const handleDecline = async () => {
        setSaving(true);
        await AsyncStorage.setItem(LOCATION_CONSENT_KEY, 'false');
        onDecline();
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeIn.duration(500)} style={styles.iconWrapper}>
                    <Ionicons name="location" size={52} color={colors.primary} />
                </Animated.View>

                <Animated.Text entering={FadeInDown.delay(150).duration(400)} style={styles.title}>
                    Location Usage
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(250).duration(400)} style={styles.subtitle}>
                    GDPR Information — Art. 13
                </Animated.Text>

                <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.card}>
                    <Section icon="navigate-outline" title="Purpose" styles={styles} colors={colors}>
                        Your GPS position is used to calculate the route to the port terminal
                        and estimate your arrival time in real time.
                    </Section>

                    <Divider styles={styles} />

                    <Section icon="server-outline" title="How it's processed" styles={styles} colors={colors}>
                        Location data is processed locally on your device for route calculation.
                        It is not stored on servers or shared with third parties.
                    </Section>

                    <Divider styles={styles} />

                    <Section icon="time-outline" title="How long" styles={styles} colors={colors}>
                        Only while the delivery is active (status <Text style={styles.mono}>in_transit</Text>).
                        When the delivery is completed or cancelled, access is stopped.
                    </Section>

                    <Divider styles={styles} />

                    <Section icon="person-outline" title="Your rights" styles={styles} colors={colors}>
                        You can withdraw this consent at any time in your device settings
                        (Settings → Privacy → Location). This does not affect deliveries
                        already completed.
                    </Section>

                    <Divider styles={styles} />

                    <Section icon="business-outline" title="Data Controller" styles={styles} colors={colors}>
                        Port of Aveiro — Intelligent Logistics System.{'\n'}
                        DPO Contact: dpo@porto-aveiro.pt
                    </Section>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnAccept]}
                        onPress={handleAccept}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                                <Text style={styles.btnText}>Accept — enable location</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btn, styles.btnDecline]}
                        onPress={handleDecline}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnDeclineText}>Decline — continue without location</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

function Section({ icon, title, children, styles, colors }: { icon: string; title: string; children: React.ReactNode; styles: Styles; colors: ThemeColors }) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon as never} size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <Text style={styles.sectionBody}>{children}</Text>
        </View>
    );
}

function Divider({ styles }: { styles: Styles }) {
    return <View style={styles.divider} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.dark,
    },
    content: {
        padding: spacing.lg,
        paddingTop: spacing.xxxl + spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.xxl,
    },
    card: {
        backgroundColor: colors.background.medium,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border.light,
        padding: spacing.xl,
        marginBottom: spacing.xxl,
    },
    section: {
        paddingVertical: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.text.primary,
    },
    sectionBody: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
        paddingLeft: spacing.xl + spacing.sm,
    },
    mono: {
        fontFamily: 'monospace',
        color: colors.primaryLight,
        fontSize: fontSize.sm,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border.light,
    },
    actions: {
        gap: spacing.md,
    },
    btn: {
        height: 50,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    btnAccept: {
        backgroundColor: colors.primary,
    },
    btnDecline: {
        borderWidth: 1,
        borderColor: colors.border.medium,
        backgroundColor: 'transparent',
    },
    btnText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
    },
    btnDeclineText: {
        color: colors.text.muted,
        fontSize: fontSize.md,
    },
});
