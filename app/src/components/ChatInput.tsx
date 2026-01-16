import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { THEME } from '../constants/config';

interface ChatInputProps {
    onSend: (text: string) => void;
    isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim()) {
            onSend(text);
            setText('');
        }
    };

    return (
        <View style={styles.container}>
            <BlurView intensity={20} tint="light" style={styles.glassContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Tell me how you feel..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={text}
                    onChangeText={setText}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.button, !text.trim() && styles.disabled]}
                    onPress={handleSend}
                    disabled={!text.trim() || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Ionicons name="arrow-up" size={24} color="#FFF" />
                    )}
                </TouchableOpacity>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        width: '100%',
    },
    glassContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.1)', // Subtle background
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        maxHeight: 100,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 8,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    disabled: {
        opacity: 0.6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        elevation: 0,
    },
});
