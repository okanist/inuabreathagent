import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, useColorScheme, View, StyleSheet } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen on mount for all platforms (web handles it differently usually, but good to be explicit)
    SplashScreen.hideAsync();
  }, []);

  const MobileContent = () => (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer as any}>
        <View style={styles.phoneMockup as any}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MobileContent />
          </GestureHandlerRootView>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MobileContent />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#0f172a', // Koyu, modern bir arka plan
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    // @ts-ignore: web-only
    minHeight: '100vh',
  },
  phoneMockup: {
    width: 375,
    height: 812,
    // @ts-ignore: web-only
    maxHeight: '90vh',
    // @ts-ignore: web-only
    maxWidth: '100vw',
    borderRadius: 35,
    borderWidth: 6,
    borderColor: '#334155',
    overflow: 'hidden',
    backgroundColor: '#000', // Match app background or generic
    // @ts-ignore
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
});
