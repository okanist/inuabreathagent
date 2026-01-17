import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, Dimensions, ScrollView, TouchableOpacity, Alert, Keyboard, AppState, Image } from 'react-native';

import { TopBar } from '../src/components/TopBar';
import { BreathingOrb } from '../src/components/BreathingOrb';
import { ChatInput } from '../src/components/ChatInput';
import { useBreathing } from '../src/hooks/useBreathing';
import { analyzeLoad } from '../src/services/api';
import { THEME } from '../src/constants/config';
import Animated, { FadeIn, FadeOut, FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_PATTERN = [4, 4, 4, 4]; // Box breathing

type ViewMode = 'chat' | 'session';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'inua';
    timestamp: number;
}

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const [isNightMode, setIsNightMode] = useState(() => {
        const hour = new Date().getHours();
        return hour >= 20 || hour < 6;
    });
    const [isPregnant, setIsPregnant] = useState(false);
    const [currentPattern, setCurrentPattern] = useState(DEFAULT_PATTERN);
    const [viewMode, setViewMode] = useState<ViewMode>('chat');

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);

    // Track dynamic bottom padding to prevent shrinking if insets glitch on resume
    const [safeBottomPadding, setSafeBottomPadding] = useState(0);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [inputY, setInputY] = useState(0);
    const [isLayoutReady, setLayoutReady] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);


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
    const { phase, instruction, isActive, timeLeft, toggle, stop } = useBreathing({ pattern: currentPattern });

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

    // Timer state for session
    const [elapsedTime, setElapsedTime] = useState(0);

    // Timer Logic
    useEffect(() => {
        let timer: any;
        if (isActive && viewMode === 'session') {
            timer = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isActive, viewMode]);

    // Reset timer when entering session
    useEffect(() => {
        if (viewMode === 'session') {
            setElapsedTime(0);
        }
    }, [viewMode]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Initialize/Update Welcome Message based on context
    useEffect(() => {
        let welcomeText = "";
        if (isPregnant) {
            welcomeText = "Hello, I'm Inua. How are you and the baby feeling today?";
        } else if (isNightMode) {
            welcomeText = "Good evening.\nHow are you feeling right now?\n\nI’ll guide you to a breathing exercise that fits your state.\n\nIf you’re pregnant, please enable Pregnancy Mode so I can guide you safely.";
        } else {
            welcomeText = "Good day.\nHow are you feeling right now?\n\nI’ll guide you to a breathing exercise that fits your state.\n\nIf you’re pregnant, please enable Pregnancy Mode so I can guide you safely.";
        }

        setMessages(prev => {
            // New persistent Welcome Message object
            const newWelcomeMsg: Message = {
                id: 'welcome',
                text: welcomeText,
                sender: 'inua',
                timestamp: Date.now() // Note: updating timestamp might be optional, but keeps it "fresh"
            };

            // 1. If empty, set it
            if (prev.length === 0) {
                return [newWelcomeMsg];
            }

            // 2. If only welcome message exists, update it if text changed
            if (prev.length === 1 && prev[0].id === 'welcome') {
                if (prev[0].text !== welcomeText) {
                    return [{ ...prev[0], text: welcomeText }];
                }
            }

            // 3. User has chatted, do not disturb history
            return prev;
        });
    }, [isPregnant, isNightMode]);

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

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (viewMode === 'chat' && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, viewMode, isKeyboardVisible]);

    const handleSend = async (text: string) => {
        // Add user message immediately
        const userMsg: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: Date.now()
        };

        // Add Transition Message immediately
        const transitionMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: "I'm preparing the best exercise for you...",
            sender: 'inua',
            timestamp: Date.now() + 1
        };

        setMessages(prev => [...prev, userMsg, transitionMsg]);

        setLoading(true);
        // Prepare session view state (but don't switch yet)
        setAnalysis("Reflecting on your feelings...");

        // Start API call in background
        const apiPromise = analyzeLoad(text, isNightMode ? 'night' : 'day', 0, isPregnant);

        // Wait for 2 seconds to let user read the message
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Now switch to session
        setViewMode('session');

        try {
            const response = await apiPromise;
            if (response) {
                setAnalysis(response.analysis);
                setCurrentPattern(response.intervention.pattern);
            }
        } catch (error) {
            console.error("Analysis failed", error);
            // Show error in session view instead of hiding it in chat
            setAnalysis("I couldn't connect to the brain, but we can still breathe together.");

            const errorMsg: Message = {
                id: Date.now().toString() + '_err',
                text: "Could not connect to AI. Please ensure the brain is running.",
                sender: 'inua',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
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
            {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                    <Animated.View
                        key={msg.id}
                        entering={FadeInDown.springify().damping(15).mass(1).stiffness(120).delay(index * 100)}
                        style={[
                            styles.messageBubble,
                            isUser ? styles.userBubble : styles.inuaBubble
                        ]}
                    >
                        {!isUser && (
                            <Text style={styles.senderName}>Inua</Text>
                        )}
                        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.inuaMessageText]}>
                            {msg.id === 'welcome' && !isUser && msg.text.includes("If you’re pregnant") ? (
                                <>
                                    {msg.text.split("If you’re pregnant")[0]}
                                    <Text style={{ fontStyle: 'italic' }}>
                                        If you’re pregnant{msg.text.split("If you’re pregnant")[1]}
                                    </Text>
                                </>
                            ) : (
                                msg.text
                            )}
                        </Text>
                    </Animated.View>
                );
            })}
        </View>
    );

    const renderSessionContent = () => (
        <View style={styles.sessionContainer}>
            {/* Header Area */}
            <View style={styles.sessionHeader}>
                <Text style={styles.sessionTitle}>Paced Breathing</Text>
                <Text style={styles.sessionTimer}>{formatTime(elapsedTime)}</Text>
            </View>

            {/* Main Orb Area */}
            <View style={styles.orbContainer}>
                <BreathingOrb phase={phase} durations={currentPattern} />
                {isPregnant && <Text style={styles.safetyTag}>Safe for Pregnancy</Text>}
            </View>

            {/* Phase Labels */}
            <View style={styles.phaseLabelsContainer}>
                <Text style={[
                    styles.phaseLabel,
                    isActive && (phase === 'inhale' || phase === 'hold-in') && styles.activePhaseLabel
                ]}>INHALE</Text>

                <Text style={[
                    styles.phaseLabel,
                    isActive && (phase === 'exhale' || phase === 'hold-out') && styles.activePhaseLabel
                ]}>EXHALE</Text>

                <Text style={[
                    styles.phaseLabel,
                    !isActive && styles.activePhaseLabel
                ]}>REST</Text>
            </View>

            {/* Bottom Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity style={styles.roundButton} onPress={handleBackToChat}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.roundButton, styles.playPauseButton]}
                    onPress={toggle}
                >
                    <Ionicons
                        name={isActive ? "pause" : "play"}
                        size={32}
                        color={THEME.colors.primary}
                    />
                </TouchableOpacity>
            </View>
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
                        ref={scrollViewRef}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={true}
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
                        ref={scrollViewRef}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={true}
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
        paddingHorizontal: 20,
        paddingBottom: 10,
        paddingTop: 20,
    },
    chatContainer: {
        flex: 1,
        justifyContent: 'flex-end', // Push messages to bottom
        paddingBottom: 0,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: THEME.colors.primary,
        borderBottomRightRadius: 4,
    },
    inuaBubble: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontWeight: '600',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userMessageText: {
        color: '#FFF',
    },
    inuaMessageText: {
        color: '#333',
    },
    sessionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
    },
    analysisContainer: {
        position: 'absolute', // Keep analysis but maybe hidden or overlaid? For now let's remove/hide it to match design, or put it elsewhere.
        // The user asked to remove text messages and focus on the clean UI.
        // Let's hide it for this specific layout or move it.
        // Given the request "middle is orb, bottom labels", analysis text might clutter.
        // We will comment it out in render for now.
        opacity: 0,
        height: 0,
    },
    // ... other styles
    sessionHeader: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 40,
    },
    sessionTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFF', // Assuming dark mode or overlay
        marginBottom: 8,
    },
    sessionTimer: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '400',
    },
    orbContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1, // Take available space
    },
    image: {
        width: 200,
        height: 200,
    },
    phaseLabelsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
        marginBottom: 60,
    },
    phaseLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.3)', // Inactive color
        letterSpacing: 1,
    },
    activePhaseLabel: {
        color: '#FFF',
        fontWeight: 'bold',
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 60,
    },
    roundButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    playPauseButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF', // White for contrast
        borderWidth: 0,
    },
    instruction: {
        // Deprecated by phase labels, keep safe
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

