import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, Dimensions, ScrollView, TouchableOpacity, Alert, Keyboard, AppState, Image } from 'react-native';

import { TopBar } from '../src/components/TopBar';
import { BreathingOrb } from '../src/components/BreathingOrb';
import { ChatInput } from '../src/components/ChatInput';
import { useBreathing } from '../src/hooks/useBreathing';
import { analyzeLoad } from '../src/services/api';
import { THEME } from '../src/constants/config';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_PATTERN = [4, 4, 4, 4]; // Box breathing

type ViewMode = 'chat' | 'session';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const [isNightMode, setIsNightMode] = useState(true);
    const [isPregnant, setIsPregnant] = useState(false);
    const [currentPattern, setCurrentPattern] = useState(DEFAULT_PATTERN);
    const [viewMode, setViewMode] = useState<ViewMode>('chat');

    // Track dynamic bottom padding to prevent shrinking if insets glitch on resume
    const [safeBottomPadding, setSafeBottomPadding] = useState(0);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [inputY, setInputY] = useState(0);
    const [isLayoutReady, setLayoutReady] = useState(false);

    // Debug log on mount


    useEffect(() => {
        // If system insets report a larger value (e.g. valid nav bar height), lock it in.
        // We never decrease it, ensuring consistency if the system reports 0 on resume glitch.
        if (insets.bottom > 0) {
            setSafeBottomPadding(prev => Math.max(prev, insets.bottom));
            // Mark layout as ready after insets are properly loaded
            if (!isLayoutReady) {
                setTimeout(() => setLayoutReady(true), 50);
            }
        }

    }, [insets.bottom]);

    // Calculate effective bottom padding - always use the maximum to ensure consistency
    const effectiveBottomPadding = Math.max(safeBottomPadding, insets.bottom, 20);
    console.log('EffectiveBottomPadding:', Math.round(effectiveBottomPadding), '| InputY:', Math.round(inputY));

    // Manual Keyboard Animation for Android
    const bottomPadding = useSharedValue(20);
    const androidPaddingStyle = useAnimatedStyle(() => ({
        paddingBottom: bottomPadding.value
    }));

    // Use ref for insets to avoid re-attaching listeners
    const insetsRef = React.useRef(insets.bottom);
    useEffect(() => {
        insetsRef.current = insets.bottom;
    }, [insets.bottom]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => {
                const height = e.endCoordinates.height;
                // MIUI bug check
                if (height > 50) {
                    setKeyboardVisible(true);
                    setKeyboardHeight(height);
                    if (Platform.OS === 'android') {
                        // User requested input to be higher (387 vs 434 -> ~47px difference)
                        // Use ref to get latest insets without re-running effect
                        const currentBottom = insetsRef.current;
                        const safeInset = currentBottom > 0 ? currentBottom : 0;
                        bottomPadding.value = withTiming(height + 20 + safeInset, { duration: 100 });
                    }
                }
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
                setKeyboardHeight(0);
                if (Platform.OS === 'android') {
                    bottomPadding.value = withTiming(20, { duration: 100 });
                }
            }
        );

        // AppState listener to dismiss keyboard on background
        // This prevents the "resume with keyboard open covering input" issue
        const appStateListener = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState.match(/inactive|background/)) {
                Keyboard.dismiss();
            }
        });

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
            appStateListener.remove();
        };
    }, []);

    // Breathing hook
    const { phase, instruction, isActive, toggle, stop } = useBreathing({ pattern: currentPattern });

    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Initial Time Check & Interval
    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours();
            const isNight = hour >= 20 || hour < 6;
            setIsNightMode(isNight);
        };
        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, []);

    // Set Default Pattern based on Context
    useEffect(() => {
        if (!isActive && viewMode === 'chat') {
            if (isPregnant) {
                setCurrentPattern([4, 0, 6, 0]); // Relax Breathing (Safe)
            } else if (isNightMode) {
                setCurrentPattern([4, 7, 8, 0]); // sleep/relax
            } else {
                setCurrentPattern([4, 4, 4, 4]); // balance/focus
            }
        }
    }, [isNightMode, isActive, viewMode, isPregnant]);

    const handleSend = async (text: string) => {
        setLoading(true);
        setAnalysis(null);
        try {
            const response = await analyzeLoad(text, isNightMode ? 'night' : 'day', 0, isPregnant);
            if (response) {
                setAnalysis(response.analysis);
                setCurrentPattern(response.intervention.pattern);
                setViewMode('session');
            }
        } catch (error) {
            if (error instanceof Error)
                setAnalysis("Could not connect to AI. Please ensure the brain is running.");
            else
                setAnalysis("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleBackToChat = () => {
        stop(); // Stop breathing
        setViewMode('chat');
        setAnalysis(null);
    };

    const handleReset = () => {
        Alert.alert(
            "Reset App",
            "Are you sure you want to reset the onboarding flow?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.removeItem('inua_has_onboarded_v1');
                        router.replace('/onboarding');
                    }
                }
            ]
        );
    };

    const renderBackground = () => {
        if (isPregnant) {
            return (
                <>
                    <Image
                        source={require('../assets/images/bgpregnant.png')}
                        style={styles.background}
                        resizeMode="cover"
                    />
                    <View style={[styles.background, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
                </>
            );
        }
        if (isNightMode) {
            return (
                <>
                    <Image
                        source={require('../assets/images/bgnight.png')}
                        style={styles.background}
                        resizeMode="cover"
                    />
                    <View style={[styles.background, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                </>
            );
        }
        // Day mode fallback
        return (
            <>
                <Image
                    source={require('../assets/images/bgday.png')}
                    style={styles.background}
                    resizeMode="cover"
                />
                <View style={[styles.background, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
            </>
        );
    };

    const renderChatContent = () => (
        <View style={styles.chatContainer}>
            <View style={styles.greetingContainer}>
                <Ionicons
                    name={isPregnant ? "heart" : (isNightMode ? "moon-outline" : "sunny-outline")}
                    size={64}
                    color={isNightMode ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.9)"}
                />
                <Text style={styles.greetingTitle}>
                    {isPregnant ? "Pregnancy Care" : (isNightMode ? "Good Evening" : "Good Day")}
                </Text>
                <Text style={styles.greetingSubtitle}>
                    {isPregnant
                        ? "How are you and the baby feeling today?"
                        : (isNightMode ? "Ready to unwind? Tell me how your day went." : "How are you feeling right now?")}
                </Text>
            </View>
        </View>
    );

    const renderSessionContent = () => (
        <View style={styles.sessionContainer}>
            {analysis && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.analysisContainer}>
                    <Text style={styles.analysisText}>{analysis}</Text>
                </Animated.View>
            )}

            <View style={styles.orbContainer}>
                <BreathingOrb phase={phase} durations={currentPattern} />
                <Text style={[styles.instruction, { color: isNightMode ? '#FFF' : '#333' }]}>
                    {isActive ? instruction : 'Ready to Start'}
                </Text>
                {isPregnant && <Text style={styles.safetyTag}>Safe for Pregnancy</Text>}
            </View>

            {!isActive && (
                <TouchableOpacity style={styles.startButton} onPress={toggle}>
                    <Text style={styles.startButtonText}>Start Session</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.backButton} onPress={handleBackToChat}>
                <Text style={styles.backButtonText}>Back to Chat</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {renderBackground()}

            <TopBar
                isNightMode={isNightMode}
                isPregnant={isPregnant}
                onTogglePregnancy={() => setIsPregnant(!isPregnant)}
                onReset={handleReset}
                onToggleNightMode={() => setIsNightMode(!isNightMode)}
            />

            {Platform.OS === 'ios' ? (
                <KeyboardAvoidingView
                    behavior="padding"
                    keyboardVerticalOffset={0}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={viewMode === 'chat'}
                    >
                        {viewMode === 'chat' ? renderChatContent() : renderSessionContent()}
                    </ScrollView>

                    {viewMode === 'chat' && (
                        <View
                            style={[
                                styles.inputWrapper,
                                { paddingBottom: 20 }
                            ]}
                            onLayout={(e) => setInputY(e.nativeEvent.layout.y)}
                        >
                            <ChatInput onSend={handleSend} isLoading={loading} />
                        </View>
                    )}
                </KeyboardAvoidingView>
            ) : (
                <Animated.View style={[{ flex: 1 }, androidPaddingStyle]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={viewMode === 'chat'}
                    >
                        {viewMode === 'chat' ? renderChatContent() : renderSessionContent()}
                    </ScrollView>

                    {viewMode === 'chat' && (
                        <View
                            style={[
                                styles.inputWrapper,
                                { paddingBottom: 0 } // Padding handled by Animated.View container
                            ]}
                            onLayout={(e) => setInputY(e.nativeEvent.layout.y)}
                        >
                            <ChatInput onSend={handleSend} isLoading={loading} />
                        </View>
                    )}
                </Animated.View>
            )}

            {/* Navigation Bar Spacer - Always rendered to prevent layout jump */}
            <View style={{
                height: isKeyboardVisible ? 0 : effectiveBottomPadding,
                backgroundColor: isPregnant ? '#F8C8DC' : (isNightMode ? '#2D1B4E' : '#87CEFA'),
            }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.colors.background,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    chatContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    greetingContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    greetingTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 16,
        marginBottom: 8,
    },
    greetingSubtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 26,
    },
    sessionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
    },
    analysisContainer: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 20,
        borderRadius: 20,
        marginBottom: 40,
        width: '100%',
    },
    analysisText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    orbContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    instruction: {
        fontSize: 32,
        fontWeight: '300',
        marginTop: 40,
        textAlign: 'center',
    },
    safetyTag: {
        color: '#FFF',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginTop: 10,
        overflow: 'hidden',
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputWrapper: {
        paddingBottom: 0,
        paddingHorizontal: 0,
        backgroundColor: 'transparent',
    },
    startButton: {
        backgroundColor: THEME.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },

});
