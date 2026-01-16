import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    withRepeat,
    withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.6;

interface BreathingOrbProps {
    phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle';
    durations: number[]; // [inhale, hold-in, exhale, hold-out]
}

export const BreathingOrb: React.FC<BreathingOrbProps> = ({ phase, durations }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.8);
    const glow = useSharedValue(0);

    const [inhaleDur, holdInDur, exhaleDur, holdOutDur] = durations;

    useEffect(() => {
        switch (phase) {
            case 'inhale':
                scale.value = withTiming(1.5, {
                    duration: inhaleDur * 1000,
                    easing: Easing.inOut(Easing.ease),
                });
                opacity.value = withTiming(1, { duration: inhaleDur * 1000 });
                break;
            case 'hold-in':
                // Mild pulsation for hold
                break;
            case 'exhale':
                scale.value = withTiming(1, {
                    duration: exhaleDur * 1000,
                    easing: Easing.inOut(Easing.ease),
                });
                opacity.value = withTiming(0.8, { duration: exhaleDur * 1000 });
                break;
            case 'hold-out':
                break;
            case 'idle':
                scale.value = withTiming(1, { duration: 1000 });
                opacity.value = withTiming(0.8, { duration: 1000 });
                break;
        }
    }, [phase, durations]);

    // Ambient glow animation
    useEffect(() => {
        glow.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2000 }),
                withTiming(0, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        };
    });

    const glowStyle = useAnimatedStyle(() => {
        return {
            opacity: 0.3 + (glow.value * 0.2),
            transform: [{ scale: 1 + (glow.value * 0.1) }]
        }
    })

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.glowContainer, glowStyle]}>
                <LinearGradient
                    colors={['rgba(74, 144, 226, 0.4)', 'transparent']}
                    style={styles.glow}
                />
            </Animated.View>
            <Animated.View style={[styles.orb, animatedStyle]}>
                <LinearGradient
                    colors={['#A594F9', '#6B4C9A']}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: ORB_SIZE * 1.5, // Space for expansion
        height: ORB_SIZE * 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orb: {
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: ORB_SIZE / 2,
        overflow: 'hidden',
        shadowColor: '#6B4C9A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    gradient: {
        flex: 1,
    },
    glowContainer: {
        position: 'absolute',
        width: ORB_SIZE * 1.4,
        height: ORB_SIZE * 1.4,
        borderRadius: (ORB_SIZE * 1.4) / 2,
    },
    glow: {
        flex: 1,
        borderRadius: (ORB_SIZE * 1.4) / 2,
    }
});
