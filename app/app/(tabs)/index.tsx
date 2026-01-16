import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TopBar } from '../../src/components/TopBar';
import { BreathingOrb } from '../../src/components/BreathingOrb';
import { ChatInput } from '../../src/components/ChatInput';
import { useBreathing } from '../../src/hooks/useBreathing';
import { analyzeLoad, Intervention } from '../../src/services/api';
import { THEME } from '../../src/constants/config';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_PATTERN = [4, 4, 4, 4]; // Box breathing

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentPattern, setCurrentPattern] = useState(DEFAULT_PATTERN);
  const { phase, instruction, isActive, toggle } = useBreathing({ pattern: currentPattern });

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Debug: Log keyboard events
  useEffect(() => {
    console.log('=== KEYBOARD DEBUG ===');
    console.log('Screen height:', SCREEN_HEIGHT);
    console.log('Screen width:', SCREEN_WIDTH);
    console.log('Safe area insets:', insets);
    console.log('Platform:', Platform.OS);

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      console.log('=== KEYBOARD SHOW ===');
      console.log('Keyboard height:', e.endCoordinates.height);
      console.log('Keyboard screenY:', e.endCoordinates.screenY);
      console.log('Keyboard screenX:', e.endCoordinates.screenX);
      console.log('Keyboard width:', e.endCoordinates.width);
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      console.log('=== KEYBOARD HIDE ===');
      console.log('Event:', e);
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets]);

  const handleSettings = () => {
    Alert.alert(
      "Reset App",
      "Would you like to reset the onboarding flow?",
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

  const handleSend = async (text: string) => {
    setLoading(true);
    setAnalysis(null);
    try {
      const response = await analyzeLoad(text);
      if (response) {
        setAnalysis(response.analysis);
        setCurrentPattern(response.intervention.pattern);
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

  // Calculate if it's night mode (20:00 - 06:00)
  const isNightMode = (() => {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 6;
  })();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={[THEME.colors.background, '#2D1B4E']}
        style={styles.background}
      />

      <TopBar isNightMode={isNightMode} />

      {/* Scrollable content area - shrinks when keyboard opens */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {analysis && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.analysisContainer}>
            <Text style={styles.analysisText}>{analysis}</Text>
          </Animated.View>
        )}

        <View style={styles.orbContainer}>
          <BreathingOrb phase={phase} durations={currentPattern} />
          <Text style={styles.instruction}>{isActive ? instruction : 'Tap to Start'}</Text>
          <Text style={styles.subtext}>{isActive ? '' : 'Box Breathing'}</Text>
        </View>
      </ScrollView>

      {/* Debug info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          KB: {keyboardVisible ? 'VISIBLE' : 'HIDDEN'} | H: {keyboardHeight} | Inset: {insets.bottom}
        </Text>
      </View>

      {/* Footer - stays at bottom, above keyboard */}
      <View style={[
        styles.footer,
        {
          marginBottom: keyboardVisible ? keyboardHeight : Math.max(insets.bottom, 10) + 60
        }
      ]}>
        {!isActive && <ChatInput onSend={handleSend} isLoading={loading} />}
        <View style={styles.controls}>
          <Text onPress={toggle} style={styles.controlButton}>
            {isActive ? 'Stop' : 'Start Practice'}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    width: '100%',
  },
  analysisText: {
    color: THEME.colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  instruction: {
    color: THEME.colors.text,
    fontSize: 32,
    fontWeight: '300',
    marginTop: 40,
    textAlign: 'center',
  },
  subtext: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footer: {
    // paddingBottom is dynamically set based on safe area
  },
  controls: {
    alignItems: 'center',
    padding: 10,
  },
  controlButton: {
    color: THEME.colors.secondary,
    fontSize: 18,
    fontWeight: '600',
    padding: 10,
  },
  debugContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugText: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

