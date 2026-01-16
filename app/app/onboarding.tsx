import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../src/constants/config';
import Animated, { FadeInRight, FadeIn } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Breathe In, Breathe Out',
        description: 'Discover the power of your breath to regulate your nervous system and find your calm.',
        icon: 'leaf-outline' as const,
    },
    {
        id: '2',
        title: 'AI-Powered Insights',
        description: 'Tell us how you feel, and our AI will recommend the perfect breathing exercise for you.',
        icon: 'chatbubbles-outline' as const,
    },
    {
        id: '3',
        title: 'Your Daily Balance',
        description: 'Track your progress, reduce anxiety, and improve your sleep with daily practice.',
        icon: 'heart-outline' as const,
    },
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            await completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('inua_has_onboarded_v1', 'true');
            router.replace('/home');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            router.replace('/home');
        }
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={100} color="#FFF" />
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        );
    };

    const currentSlide = SLIDES[currentIndex];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[THEME.colors.background, '#2D1B4E']}
                style={styles.background}
            />

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                keyExtractor={(item) => item.id}
            />

            <View style={styles.footer}>
                {/* Pagination Dots */}
                <View style={styles.pagination}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentIndex === index && styles.activeDot,
                            ]}
                        />
                    ))}
                </View>

                {/* Action Button */}
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>
                        {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
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
        ...StyleSheet.absoluteFillObject,
    },
    slide: {
        width,
        height: height * 0.7, // Occupy top 70%
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 200,
        height: 200,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        height: height * 0.3,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 50,
    },
    pagination: {
        flexDirection: 'row',
        height: 20,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: THEME.colors.primary,
        width: 24,
    },
    button: {
        backgroundColor: THEME.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 60,
        borderRadius: 30,
        marginBottom: 20,
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    }
});
