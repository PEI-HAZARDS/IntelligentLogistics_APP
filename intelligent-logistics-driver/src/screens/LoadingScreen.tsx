/**
 * Loading Screen - Shown while checking authentication
 */
import React, { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { fontSize, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

export default function LoadingScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.text}>Loading...</Text>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.dark,
    },
    text: {
        marginTop: 16,
        color: colors.text.secondary,
        fontSize: fontSize.md,
    },
});
