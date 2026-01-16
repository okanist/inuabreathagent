import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TopBar } from '../src/components/TopBar';
import { THEME } from '../src/constants/config';
import { Ionicons } from '@expo/vector-icons';

export default function VoiceMoodScreen() {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[THEME.colors.background, '#2D1B4E']}
                style={styles.background}
            />

            <TopBar title="Voice Mode" />

            <View style={styles.content}>
                <View style={styles.circle}>
                    <Ionicons name="mic-outline" size={64} color={THEME.colors.text} />
                </View>

                <Text style={styles.title}>Voice Analysis</Text>
                <Text style={styles.description}>
                    Speak freely about how you're feeling. AI will analyze your tone and words.
                </Text>

                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Hold to Speak</Text>
                </TouchableOpacity>

                <Text style={styles.note}>
                    Note: Voice analysis is currently available in development builds only.
                </Text>
            </View>
        </View>
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
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME.colors.text,
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: THEME.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 24,
    },
    button: {
        backgroundColor: THEME.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 30,
        marginBottom: 24,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    note: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
    }
});
