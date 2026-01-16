import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { THEME } from '../../src/constants/config';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(26, 26, 46, 0.9)',
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ?
            <BlurView intensity={80} tint="dark" style={{ flex: 1 }} /> :
            undefined
        ),
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Breathe',
          tabBarIcon: ({ color }) => <Ionicons name="water-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Ionicons name="compass-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
