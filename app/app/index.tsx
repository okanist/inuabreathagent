import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

export default function Index() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Small delay to ensure navigation is ready
        const timer = setTimeout(() => {
            checkOnboarding();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const checkOnboarding = async () => {
        try {
            const hasOnboarded = await AsyncStorage.getItem('inua_has_onboarded_v1');
            console.log('Onboarding status:', hasOnboarded);

            if (hasOnboarded === 'true') {
                router.replace('/home');
            } else {
                router.replace('/onboarding');
            }
        } catch (e) {
            console.error('Onboarding check error:', e);
            // Default to onboarding if error
            router.replace('/onboarding');
        } finally {
            setIsReady(true);
        }
    };

    return <View style={{ flex: 1, backgroundColor: '#1A1A2E' }} />;
}
