import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

interface PhaseLabelProps {
    text: string;
    isActive: boolean;
}

export const PhaseLabel: React.FC<PhaseLabelProps> = ({ text, isActive }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        scale.value = withTiming(isActive ? 1.5 : 1, { duration: 400, easing: Easing.inOut(Easing.ease) });
        opacity.value = withTiming(isActive ? 1 : 0.3, { duration: 400 });
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.Text style={[styles.label, animatedStyle, isActive && styles.activeLabel]}>
            {text}
        </Animated.Text>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        letterSpacing: 1,
        marginHorizontal: 10, // Add some spacing here instead of parent gap
    },
    activeLabel: {
        fontWeight: 'bold',
        textShadowColor: 'rgba(255, 255, 255, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    }
});
