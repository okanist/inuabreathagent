import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    withRepeat,
    withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const ORB_SIZE = Platform.OS === 'web'
    ? Math.min(width * 0.45, 190) // Slightly smaller on web
    : Math.min(width * 0.55, 230); // Standard size for mobile

interface BreathingOrbProps {
    phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle';
    durations: number[];
}

export const BreathingOrb: React.FC<BreathingOrbProps> = ({ phase, durations }) => {
    const scale = useSharedValue(1);

    const [inhaleDur, holdInDur, exhaleDur, holdOutDur] = durations;

    useEffect(() => {
        const config = { easing: Easing.inOut(Easing.ease) };

        switch (phase) {
            case 'inhale':
                scale.value = withTiming(1.35, { duration: inhaleDur * 1000, ...config });
                break;
            case 'hold-in':
                scale.value = withTiming(1.4, { duration: holdInDur * 1000, ...config });
                break;
            case 'exhale':
                scale.value = withTiming(1, { duration: exhaleDur * 1000, ...config });
                break;
            case 'hold-out':
                scale.value = withTiming(0.95, { duration: holdOutDur * 1000, ...config });
                break;
            case 'idle':
                scale.value = withRepeat(withSequence(
                    withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ), -1, true);
                break;
        }
    }, [phase, durations]);

    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.outerContainer}>
            {/* 1. ANIMATION WRAPPER - Scales everything including the aura */}
            <Animated.View style={[styles.mainWrapper, containerAnimatedStyle]}>

                {/* 2. THE NEON GLOWS (Layered for depth) */}
                {/* Outer soft glow */}
                <LinearGradient
                    colors={['rgba(0, 242, 255, 0.4)', 'rgba(188, 0, 255, 0.4)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.auraOuter}
                />
                {/* Inner intense neon core */}
                <LinearGradient
                    colors={['#00F2FF', '#BC00FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.auraInner}
                />

                {/* 3. THE ORB (Masked Glass) */}
                <View style={styles.orbMask}>
                    {/* The Frosted Base - Increased intensity for better glass feel */}
                    <BlurView
                        intensity={Platform.OS === 'web' ? 45 : 95}
                        tint="light"
                        style={Platform.OS === 'web' ? [StyleSheet.absoluteFill, styles.webBlurFix] : StyleSheet.absoluteFill}
                    >

                        {/* 4. BASE TEXTURE / REFRACTION LAYER - Thinner, more transparent */}
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.25)', 'rgba(0, 242, 255, 0.1)', 'rgba(188, 0, 255, 0.08)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* Internal illumination - More subtle for transparency */}
                        <LinearGradient
                            colors={['rgba(0, 242, 255, 0.2)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.7, y: 0.7 }}
                            style={StyleSheet.absoluteFill}
                        />

                        <LinearGradient
                            colors={['transparent', 'rgba(188, 0, 255, 0.2)']}
                            start={{ x: 0.3, y: 0.3 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* White rim hint for volume without losing transparency */}
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.3)', 'transparent']}
                            start={{ x: 0.5, y: 1 }}
                            end={{ x: 0.5, y: 0.8 }}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* Top-left soft gloss */}
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.5)', 'transparent']}
                            style={styles.glossHighlightLarge}
                        />

                        {/* Sharp specular highlight - more intense to compensate for transparency */}
                        <View style={styles.specularHighlight} />
                    </BlurView>
                </View>

                {/* 5. RIM LIGHT / GLASS EDGE */}
                <View pointerEvents="none" style={styles.rimOverlay} />

            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: ORB_SIZE * 1.6,
        height: ORB_SIZE * 1.6,
    },
    mainWrapper: {
        width: ORB_SIZE,
        height: ORB_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    auraOuter: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: ORB_SIZE / 2,
        opacity: 0.12,
        ...Platform.select({
            ios: {
                shadowColor: '#BC00FF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 60,
            },
            android: {
                elevation: 15,
            },
            web: {
                filter: 'blur(30px)',
                boxShadow: '0 0 80px rgba(188, 0, 255, 0.5), 0 0 50px rgba(0, 242, 255, 0.3)',
            } as any
        })
    },
    auraInner: {
        position: 'absolute',
        width: '105%',
        height: '105%',
        borderRadius: ORB_SIZE,
        opacity: 0.4,
        ...Platform.select({
            ios: {
                shadowColor: '#00F2FF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 15,
            },
            android: {
                elevation: 20,
            },
            web: {
                filter: 'blur(8px)',
                boxShadow: '0 0 25px rgba(0, 242, 255, 0.8), 0 0 15px rgba(188, 0, 255, 0.6)',
            } as any
        })
    },
    orbMask: {
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: ORB_SIZE / 2,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
        ...Platform.select({
            web: {
                // Ensure proper circular clipping on web browsers
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
            } as any
        })
    },
    webBlurFix: {
        borderRadius: ORB_SIZE / 2,
        overflow: 'hidden',
        // Force backdrop filter on web for maximum glass effect
        backdropFilter: 'blur(15px)',
    } as any,
    glossHighlightLarge: {
        position: 'absolute',
        top: '5%',
        left: '15%',
        width: '60%',
        height: '40%',
        borderRadius: 100,
        opacity: 0.4,
        transform: [{ rotate: '-15deg' }],
    },
    specularHighlight: {
        position: 'absolute',
        top: '12%',
        left: '28%',
        width: '10%',
        height: '6%',
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.85)', // Brighter specular
        transform: [{ rotate: '-15deg' }],
    },
    rimOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: ORB_SIZE / 2,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.8)', // Sharper rim
        opacity: 0.3, // Very subtle, let internal layers do the work
        ...Platform.select({
            web: {
                boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3)',
            } as any
        })
    },
});
