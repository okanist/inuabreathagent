import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TextOnlySessionProps {
    title: string;
    /** Centered instruction text (e.g. from ui_texts.bottom_sound_text) */
    instructionText: string | null;
}

/**
 * Session view for screen_type === 'screen2': no orb, only centered text.
 */
export const TextOnlySession: React.FC<TextOnlySessionProps> = ({ title, instructionText }) => {
    const displayText = instructionText?.trim() || title;
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.textWrapper}>
                <Text style={styles.instruction}>{displayText}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 24,
    },
    textWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '100%',
    },
    instruction: {
        fontSize: 20,
        fontWeight: '500',
        color: '#FFF',
        textAlign: 'center',
        lineHeight: 30,
    },
});
