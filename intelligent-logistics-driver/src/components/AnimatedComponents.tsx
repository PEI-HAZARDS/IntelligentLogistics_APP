/**
 * Animated Components for Driver App
 * Provides reusable animated wrappers for smooth UI transitions
 */
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    FadeIn,
    FadeInDown,
    FadeInUp,
    SlideInDown,
    SlideInUp,
    SlideInRight,
    Layout,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Re-export entering animations for convenience
export { FadeIn, FadeInDown, FadeInUp, SlideInDown, SlideInUp, SlideInRight, Layout };

interface AnimatedCardProps {
    children: React.ReactNode;
    delay?: number;
    style?: ViewStyle;
}

/**
 * Animated card that fades in and slides up with delay
 */
export function AnimatedCard({ children, delay = 0, style }: AnimatedCardProps) {
    return (
        <Animated.View
            entering={FadeInUp.delay(delay).duration(400).springify()}
            layout={Layout.springify()}
            style={style}
        >
            {children}
        </Animated.View>
    );
}

/**
 * Animated section that fades in from below
 */
export function AnimatedSection({ children, delay = 0, style }: AnimatedCardProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(500).easing(Easing.out(Easing.cubic))}
            style={style}
        >
            {children}
        </Animated.View>
    );
}

/**
 * Animated list item with stagger effect
 */
interface AnimatedListItemProps extends AnimatedCardProps {
    index: number;
}

export function AnimatedListItem({ children, index, style }: AnimatedListItemProps) {
    const baseDelay = 50; // 50ms between each item
    return (
        <Animated.View
            entering={SlideInRight.delay(index * baseDelay).duration(300).springify()}
            layout={Layout.springify()}
            style={style}
        >
            {children}
        </Animated.View>
    );
}

/**
 * Skeleton loading placeholder with shimmer effect
 */
interface SkeletonProps {
    width?: number | `${number}%`;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const shimmerValue = useSharedValue(0);

    useEffect(() => {
        shimmerValue.value = withTiming(1, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
        });

        // Loop the animation
        const interval = setInterval(() => {
            shimmerValue.value = 0;
            shimmerValue.value = withTiming(1, {
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [shimmerValue]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 0.3 + shimmerValue.value * 0.4,
    }));

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                animatedStyle,
                style,
            ]}
        />
    );
}

/**
 * Skeleton card for loading states
 */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
    return (
        <Animated.View style={[skeletonStyles.card, style]} entering={FadeIn.duration(300)}>
            <Skeleton width="60%" height={18} style={skeletonStyles.title} />
            <Skeleton width="40%" height={14} style={skeletonStyles.subtitle} />
            <Skeleton width="80%" height={12} />
        </Animated.View>
    );
}

const skeletonStyles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
        padding: 16,
        gap: 8,
    },
    title: {
        marginBottom: 4,
    },
    subtitle: {
        marginBottom: 8,
    },
});

/**
 * Haptic feedback utilities
 */
export const haptics = {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    selection: () => Haptics.selectionAsync(),
};

/**
 * Alert animation wrapper
 */
interface AnimatedAlertProps {
    children: React.ReactNode;
    visible: boolean;
    style?: ViewStyle;
}

export function AnimatedAlert({ children, visible, style }: AnimatedAlertProps) {
    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={style}
        >
            {children}
        </Animated.View>
    );
}
