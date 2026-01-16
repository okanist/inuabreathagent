import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { THEME } from '../constants/config';

interface TopBarProps {
    title?: string;
    isNightMode: boolean;
    isPregnant?: boolean;
    onTogglePregnancy?: () => void;
    onReset?: () => void;
    onToggleNightMode?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title = 'INUA', isNightMode, isPregnant, onTogglePregnancy, onReset, onToggleNightMode }) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>

                <View style={styles.rightContent}>
                    {/* Reset Button */}
                    {onReset && (
                        <TouchableOpacity onPress={onReset} style={styles.iconButton}>
                            <Ionicons name="refresh-circle-outline" size={22} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    )}

                    {/* Pregnancy Toggle */}
                    {onTogglePregnancy && (
                        <TouchableOpacity
                            onPress={onTogglePregnancy}
                            style={[styles.pregnancyToggle, isPregnant && styles.pregnancyActive]}
                        >
                            <Ionicons
                                name={isPregnant ? "heart" : "heart-outline"}
                                size={18}
                                color={isPregnant ? "#FFF" : "rgba(255,255,255,0.7)"}
                            />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.pillContainer}
                        onPress={onToggleNightMode}
                    >
                        <Ionicons
                            name={isNightMode ? "moon" : "sunny"}
                            size={14}
                            color="rgba(255,255,255,0.9)"
                            style={styles.icon}
                        />
                        <Text style={styles.pillText}>
                            {isNightMode ? 'NIGHT' : 'DAY'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 50, // Safe area approximation
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: THEME.colors.text,
        letterSpacing: 2,
    },
    pillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    pillText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginLeft: 6,
    },
    icon: {
        opacity: 0.9,
    },
    iconButton: {
        padding: 4,
    },
    pregnancyToggle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pregnancyActive: {
        backgroundColor: '#FF69B4', // Hot pink or user's preferred color
        borderColor: '#FF69B4',
    }
});
