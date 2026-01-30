/**
 * Loading Screen - Shown while checking authentication
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors, fontSize } from '../theme/colors';

export default function LoadingScreen() {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.text}>Loading...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
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
