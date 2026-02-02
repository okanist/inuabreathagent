import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, Dimensions, ScrollView, TouchableOpacity, Alert, Keyboard, AppState, Image } from 'react-native';

import { TopBar } from '../src/components/TopBar';
import { BreathingOrb } from '../src/components/BreathingOrb';
import { TextOnlySession } from '../src/components/TextOnlySession';
import { PhaseLabel } from '../src/components/PhaseLabel';
import { ChatInput } from '../src/components/ChatInput';
import { useBreathing } from '../src/hooks/useBreathing';
import { BreathingAgentService, TECHNIQUE_PATTERNS, DEFAULT_PATTERN_FALLBACK } from '../src/services/BreathingAgentService';
import { getTechniqueById } from '../src/data/techniques';
// import { analyzeLoad } from '../src/services/api'; // Deprecated
import { THEME } from '../src/constants/config';
import Animated, { FadeIn, FadeOut, FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Markdown from 'react-native-markdown-display';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_PATTERN = [4, 4, 4, 4]; // Box breathing

type ViewMode = 'chat' | 'session';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'inua';
    timestamp: number;
    action?: {
        type: 'start_session';
        label: string;
        data: SessionData;
    };
}

export type ScreenType = 'breathing' | 'screen2';

export interface SessionData {
    title: string;
    pattern: number[];
    duration: number;
    instructions?: Record<string, string | undefined>;
    screen_type: ScreenType;
    /** Centered text for screen2 (no orb) */
    screen2_text?: string | null;
}

const parsePatternString = (str?: string): number[] => {
    if (!str) return DEFAULT_PATTERN;
    if (str === "special_sip") return [4, 0, 4, 0];
    if (str === "double_inhale_long_exhale") return [3, 1, 6, 0];

    const parts = str.split('-').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) return parts;
    return DEFAULT_PATTERN;
};

// V2 Schema: Convert phases object to number[] array
const parsePhasesObject = (phases?: { inhale_sec?: number; hold_in_sec?: number; exhale_sec?: number; hold_out_sec?: number }): number[] => {
    if (!phases) return DEFAULT_PATTERN;
    return [
        phases.inhale_sec ?? 4,
        phases.hold_in_sec ?? 0,
        phases.exhale_sec ?? 4,
        phases.hold_out_sec ?? 0
    ];
};

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const [isNightMode, setIsNightMode] = useState(() => {
        const hour = new Date().getHours();
        return hour >= 20 || hour < 6;
    });
    const [isPregnant, setIsPregnant] = useState(false);
    const [currentPattern, setCurrentPattern] = useState(DEFAULT_PATTERN);
    const [sessionInstructions, setSessionInstructions] = useState<Record<string, string | undefined> | undefined>(undefined);
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

    // Calculate effective bottom padding - use smaller minimum for closer nav bar position
    const effectiveBottomPadding = Math.max(safeBottomPadding, insets.bottom, 10);
    // Debug log disabled to reduce noise
    // console.log('EffectiveBottomPadding:', Math.round(effectiveBottomPadding), '| InputY:', Math.round(inputY));

    // Manual Keyboard Animation for Android
    const bottomPadding = useSharedValue(10);
    const androidPaddingStyle = useAnimatedStyle(() => ({
        paddingBottom: bottomPadding.value
    }));

    // Use ref for insets to avoid re-attaching listeners
    const insetsRef = React.useRef(insets.bottom);
    useEffect(() => {
        insetsRef.current = insets.bottom;
    }, [insets.bottom]);

    // Track max keyboard height for MIUI consistency
    const maxKeyboardHeightRef = React.useRef(0);

    const hideTimeoutRef = useRef<any>(null);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => {
                // Cancel any pending hide
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                }

                const height = e.endCoordinates.height;
                console.log('=== KEYBOARD SHOW ===');
                console.log('Reported height:', height);

                // Use a threshold to filter out noise
                if (height > 50) {
                    setKeyboardVisible(true);
                    setKeyboardHeight(height);
                    bottomPadding.value = height + 10;
                }
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                // Debounce the hide action
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

                hideTimeoutRef.current = setTimeout(() => {
                    setKeyboardVisible(false);
                    setKeyboardHeight(0);
                    bottomPadding.value = 10;
                    hideTimeoutRef.current = null;
                }, 300); // 300ms delay
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
    const [sessionLimit, setSessionLimit] = useState(180); // Default 3 mins
    const [sessionTitle, setSessionTitle] = useState("Paced Breathing");
    const [sessionScreenType, setSessionScreenType] = useState<ScreenType>('breathing');
    const [sessionScreen2Text, setSessionScreen2Text] = useState<string | null>(null);
    /** For screen2: only duration timer runs (no breathing cycle) */
    const [sessionTimerActive, setSessionTimerActive] = useState(false);

    // Timer Logic (runs for both breathing session and screen2 text-only session)
    useEffect(() => {
        let timer: any;
        const timerRunning = (isActive || sessionTimerActive) && viewMode === 'session';
        if (timerRunning) {
            timer = setInterval(() => {
                setElapsedTime(prev => {
                    const nextTime = prev + 1;
                    if (nextTime >= sessionLimit) {
                        clearInterval(timer);
                        stop();
                        setSessionTimerActive(false);
                        setTimeout(() => {
                            Alert.alert("Session Complete", "Great job taking time for yourself.", [
                                { text: "OK", onPress: handleBackToChat }
                            ]);
                        }, 500);
                        return nextTime;
                    }
                    return nextTime;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isActive, sessionTimerActive, viewMode, sessionLimit]);

    // ...

    // Reset timer and screen2 state when entering session
    useEffect(() => {
        if (viewMode === 'session') {
            setElapsedTime(0);
            setSessionTimerActive(false);
        }
    }, [viewMode]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const totalM = Math.floor(sessionLimit / 60);
        const totalS = sessionLimit % 60;
        return `${m}:${s < 10 ? '0' : ''}${s} / ${totalM}:${totalS < 10 ? '0' : ''}${totalS}`;
    };



    // Initialize/Update Welcome Message based on context
    useEffect(() => {
        let welcomeText = "";
        if (isPregnant && isNightMode) {
            // Pregnant + Night
            welcomeText = "Hello, I'm Inua.\nThis is a quiet moment just for you.\n\nHow are you and the baby feeling right now?";
        } else if (isPregnant) {
            // Pregnant + Day
            welcomeText = "Hi, I'm Inua.\nLet's check in with your body for a moment.\n\nHow are you and the baby feeling right now?";
        } else if (isNightMode) {
            welcomeText = "Good evening.\nHow are you feeling right now?\n\nI’ll guide you to a breathing exercise that fits your state.\n\n_If you’re pregnant, please enable Pregnancy Mode so I can guide you safely._";
        } else {
            welcomeText = "Good day.\nHow are you feeling right now?\n\nI’ll guide you to a breathing exercise that fits your state.\n\n_If you’re pregnant, please enable Pregnancy Mode so I can guide you safely._";
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
        // const apiPromise = analyzeLoad(text, isNightMode ? 'night' : 'day', 0, isPregnant);

        // --- NEW INTEGRATION START ---

        const userProfile = {
            is_pregnant: isPregnant,
            trimester: undefined, // Removed hardcoded default '2'. The Agent will handle unknowns.
            current_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            country_code: "TR" // Could fetch from locale
        };

        try {
            // Artificial Delay for UX
            await new Promise(resolve => setTimeout(resolve, 1500));

            const response = await BreathingAgentService.callRemoteAgent(text, userProfile);

            // 1. Check Emergency
            if (response.emergency_override) {
                setLoading(false);
                setViewMode('chat'); // Stay in chat to show alert or handle UI

                const override = response.emergency_override;
                Alert.alert(
                    "Safety Alert",
                    override.display_message,
                    override.buttons.map(btn => ({
                        text: btn.label,
                        onPress: () => {
                            if (btn.action === 'call_phone' && btn.number) {
                                // Linking.openURL(`tel:${btn.number}`)
                                console.log("Call", btn.number);
                            }
                        }
                    }))
                );
                return;
            }

            // 3. Construct Actionable Message (V2 Schema)
            const suggested = response.suggested_technique;
            const techId = response.suggested_technique_id || suggested?.id;
            let actionData = undefined;

            // Helper: Convert tech ID to display title (e.g., "4_7_8_sleep" -> "4-7-8 Sleep")
            const formatTechId = (id: string): string => {
                return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/(\d) (\d)/g, '$1-$2');
            };

            if (techId) {
                // Technique: backend suggested_technique is primary (from all_db.json); fallback to local only when offline
                const localTech = getTechniqueById(techId);
                const tech = suggested ?? localTech;
                const title = tech?.title ?? formatTechId(techId);
                let pattern = DEFAULT_PATTERN_FALLBACK;
                if (tech?.phases) {
                    pattern = parsePhasesObject(tech.phases);
                } else {
                    pattern = TECHNIQUE_PATTERNS[techId] ?? DEFAULT_PATTERN_FALLBACK;
                }
                if (isPregnant && (pattern[1] > 0 || pattern[3] > 0)) {
                    pattern = [pattern[0], 0, pattern[2], 0];
                }
                const uiTexts = tech?.ui_texts;
                const instructions: Record<string, string | undefined> | undefined = uiTexts ? {
                    'inhale': uiTexts.inhale,
                    'hold-in': uiTexts.hold_in,
                    'exhale': uiTexts.exhale,
                    'hold-out': uiTexts.hold_out
                } : undefined;
                const screen_type: ScreenType = tech?.screen_type === 'screen2' ? 'screen2' : 'breathing';
                const screen2_text = tech?.ui_texts?.bottom_sound_text ?? null;

                actionData = {
                    title,
                    pattern,
                    duration: response.duration_seconds ?? tech?.default_duration_sec ?? 180,
                    instructions,
                    screen_type,
                    screen2_text: screen_type === 'screen2' ? (screen2_text || title) : undefined
                };
            }

            // Build message text with instruction if available
            let messageText = response.message_for_user || "I can help with that.";
            
            // Add instruction_text in format: "**Technique**: instruction"
            if (response.instruction_text && actionData?.title) {
                messageText += `\n\n**${actionData.title}**: ${response.instruction_text}`;
            } else if (response.instruction_text) {
                // Fallback if title not available
                const techTitle = suggested?.title || formatTechId(techId || '');
                if (techTitle) {
                    messageText += `\n\n**${techTitle}**: ${response.instruction_text}`;
                }
            }

            const agentMsg: Message = {
                id: Date.now().toString() + '_ai',
                text: messageText,
                sender: 'inua',
                timestamp: Date.now(),
                action: actionData ? {
                    type: 'start_session',
                    label: `Start ${actionData.title}`,
                    data: actionData
                } : undefined
            };

            setMessages(prev => [...prev, agentMsg]);
            setLoading(false);

        } catch (error) {
            console.error("Agent failed", error);

            const errorMsg: Message = {
                id: Date.now().toString() + '_err',
                text: "Could not connect to AI. Please ensure the brain is running.",
                sender: 'inua',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
            setLoading(false);
        }
    };

    const handleBackToChat = () => {
        stop();
        setSessionTimerActive(false);
        setViewMode('chat');
        setAnalysis(null);
    };

    const handleReset = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to reset the onboarding flow?");
            if (confirmed) {
                await AsyncStorage.removeItem('inua_has_onboarded_v1');
                router.replace('/onboarding');
            }
        } else {
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
        }
    };

    const handleStartSession = (data: SessionData) => {
        setSessionTitle(data.title);
        setCurrentPattern(data.pattern);
        setSessionLimit(data.duration);
        setSessionInstructions(data.instructions);
        setSessionScreenType(data.screen_type);
        setSessionScreen2Text(data.screen2_text ?? null);
        setViewMode('session');
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
                        <Markdown
                            style={{
                                body: {
                                    fontSize: 16,
                                    lineHeight: 22,
                                    color: isUser ? '#FFF' : '#333',
                                },
                                strong: {
                                    color: isUser ? '#FFF' : '#333',
                                    fontWeight: 'bold',
                                },
                                em: {
                                    color: isUser ? '#FFF' : '#333',
                                    fontStyle: 'italic',
                                },
                                paragraph: {
                                    // Remove bottom margin to match bubble sizing better if needed
                                    marginBottom: 0,
                                    marginTop: 0,
                                    flexWrap: 'wrap',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                },
                            }}
                        >
                            {msg.text}
                        </Markdown>

                        {/* Action Button */}
                        {msg.action && msg.action.type === 'start_session' && (
                            <TouchableOpacity
                                style={{
                                    marginTop: 15,
                                    backgroundColor: THEME.colors.primary,
                                    paddingVertical: 12,
                                    paddingHorizontal: 20,
                                    borderRadius: 25,
                                    alignItems: 'center',
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 3,
                                    elevation: 3,
                                }}
                                onPress={() => handleStartSession(msg.action!.data)}
                            >
                                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                                    {msg.action.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                );
            })}
        </View>
    );

    const renderSessionContent = () => {
        const isScreen2 = sessionScreenType === 'screen2';
        const sessionRunning = isScreen2 ? sessionTimerActive : isActive;
        return (
        <View style={styles.sessionContainer}>
            <View style={styles.sessionHeader}>
                <Text style={styles.sessionTitle}>{sessionTitle}</Text>
                <Text style={styles.sessionTimer}>{formatTime(elapsedTime)}</Text>
            </View>

            {isScreen2 ? (
                /* screen2: no orb, only centered text */
                <>
                    <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                        <TextOnlySession
                            title={sessionTitle}
                            instructionText={sessionScreen2Text}
                        />
                    </View>
                </>
            ) : (
                /* breathing: phase label + orb */
                <>
                    <View style={{ marginTop: 40, marginBottom: 20, alignItems: 'center', height: 40 }}>
                        <Text style={[styles.activePhaseLabel, { fontSize: 28, textAlign: 'center' }]}>
                            {(() => {
                                if (!isActive) return "Tap Play";
                                const [inhale, holdIn, exhale, holdOut] = currentPattern;
                                const pDur = phase === 'inhale' ? inhale :
                                    phase === 'hold-in' ? holdIn :
                                        phase === 'exhale' ? exhale :
                                            phase === 'hold-out' ? holdOut : 0;
                                if (pDur <= 0) return "";
                                const text = sessionInstructions?.[phase] ||
                                    (phase === 'idle' ? 'Ready' :
                                        phase === 'hold-in' ? 'HOLD' :
                                            phase === 'hold-out' ? 'HOLD' :
                                                phase.toUpperCase());
                                return text;
                            })()}
                        </Text>
                    </View>
                    <View style={styles.orbContainer}>
                        <BreathingOrb phase={phase} durations={currentPattern} />
                        {isPregnant && Platform.OS !== 'web' && <Text style={styles.safetyTag}>Safe for Pregnancy</Text>}
                    </View>
                </>
            )}

            <View style={styles.controlsContainer}>
                <TouchableOpacity style={styles.roundButton} onPress={handleBackToChat}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.roundButton, styles.playPauseButton]}
                    onPress={() => isScreen2 ? setSessionTimerActive(prev => !prev) : toggle()}
                >
                    <Ionicons
                        name={sessionRunning ? "pause" : "play"}
                        size={32}
                        color={THEME.colors.primary}
                    />
                </TouchableOpacity>
            </View>
        </View>
        );
    };

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

            {viewMode === 'session' ? (
                // Session View - No ScrollView, No Keyboard Handling needed
                <View style={{ flex: 1, paddingHorizontal: 20 }}>
                    {renderSessionContent()}
                </View>
            ) : (
                // Chat View - Needs ScrollView and Keyboard Handling
                Platform.OS === 'ios' ? (
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
                            {renderChatContent()}
                        </ScrollView>

                        <View
                            style={[
                                styles.inputWrapper,
                                { paddingBottom: 20 }
                            ]}
                        >
                            <ChatInput onSend={handleSend} isLoading={loading} />
                        </View>
                    </KeyboardAvoidingView>
                ) : (
                    <Animated.View style={[{ flex: 1 }, androidPaddingStyle]}>
                        <ScrollView
                            ref={scrollViewRef}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            scrollEnabled={true}
                        >
                            {renderChatContent()}
                        </ScrollView>

                        <View
                            style={[
                                styles.inputWrapper,
                                {
                                    paddingBottom: 4,
                                    marginBottom: 10
                                }
                            ]}
                        >
                            <ChatInput onSend={handleSend} isLoading={loading} />
                        </View>
                    </Animated.View>
                )
            )}
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
        marginTop: 10, // Reduced further
        marginBottom: 10, // Reduced further
    },
    sessionTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFF',
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
        flex: 1,
        paddingBottom: 40, // Visually lift the orb to center it better between text and controls
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
        marginBottom: 20, // Reduced from 40 to bring closer to buttons
    },
    phaseLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.3)',
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
        gap: 25, // Reduced gap
        marginBottom: 40,
    },
    roundButton: {
        width: 44, // Reduced from 50
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    playPauseButton: {
        width: 64, // Reduced from 70
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF',
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

