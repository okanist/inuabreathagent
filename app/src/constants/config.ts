import { Platform } from 'react-native';

// Replace with your local machine's IP address
// Use '10.0.2.2' for Android Emulator, 'localhost' for iOS Simulator
// For physical devices, use your computer's local IP (e.g., 192.168.1.x)
const LOCAL_IP = '192.168.1.9';
const PORT = '8000';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:${PORT}`;

export const THEME = {
  colors: {
    primary: '#6B4C9A', // Spiritual purple
    secondary: '#4A90E2', // Calming blue
    background: '#1A1A2E', // Deep night
    surface: 'rgba(255, 255, 255, 0.1)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    success: '#4CD964',
    error: '#FF3B30',
  },
  spacing: {
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
  },
  borderRadius: {
    s: 8,
    m: 16,
    l: 24,
    circular: 999,
  }
};
