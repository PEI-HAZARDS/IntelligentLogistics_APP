import React, { useState } from 'react';
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
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';

export const LOCATION_CONSENT_KEY = 'location_consent_given';

interface Props {
    onConsent: () => void;
    onDecline: () => void;
}

export default function LocationConsentScreen({ onConsent, onDecline }: Props) {
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
                    Utilização da Localização
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(250).duration(400)} style={styles.subtitle}>
                    Informação ao abrigo do RGPD — Art. 13
                </Animated.Text>

                <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.card}>
                    <Section icon="navigate-outline" title="Para que serve">
                        A sua posição GPS é utilizada para calcular a rota até ao terminal portuário
                        e estimar o tempo de chegada em tempo real.
                    </Section>

                    <Divider />

                    <Section icon="server-outline" title="Como é tratada">
                        A localização é processada localmente no dispositivo para cálculo de rota.
                        Não é armazenada em servidores nem partilhada com terceiros.
                    </Section>

                    <Divider />

                    <Section icon="time-outline" title="Durante quanto tempo">
                        Apenas enquanto a entrega estiver ativa (estado <Text style={styles.mono}>em_trânsito</Text>).
                        Ao concluir ou cancelar a entrega, o acesso é interrompido.
                    </Section>

                    <Divider />

                    <Section icon="person-outline" title="Os seus direitos">
                        Pode revogar este consentimento a qualquer momento nas definições do
                        dispositivo (Definições → Privacidade → Localização). Tal não afeta entregas
                        já concluídas.
                    </Section>

                    <Divider />

                    <Section icon="business-outline" title="Responsável pelo tratamento">
                        Porto de Aveiro — Intelligent Logistics System.{'\n'}
                        Contacto DPO: dpo@porto-aveiro.pt
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
                                <Text style={styles.btnText}>Aceito — ativar localização</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btn, styles.btnDecline]}
                        onPress={handleDecline}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnDeclineText}>Recusar — continuar sem localização</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
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

function Divider() {
    return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
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
