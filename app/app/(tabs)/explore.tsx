import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TopBar } from '../../src/components/TopBar';
import { THEME } from '../../src/constants/config';
import { BlurView } from 'expo-blur';

const EXERCISES = [
  {
    title: 'Physiological Sigh',
    subtitle: 'For Acute Stress',
    pattern: '2-1-4-0',
    description: 'Double inhale through nose, long exhale through mouth. Resets carbon dioxide levels.',
    color: ['#FF9A9E', '#FECFEF'],
  },
  {
    title: 'Box Breathing',
    subtitle: 'For Focus & Anxiety',
    pattern: '4-4-4-4',
    description: 'Equal duration for inhale, hold, exhale, hold. Used by Navy SEALs for regulation.',
    color: ['#A18CD1', '#FBC2EB'],
  },
  {
    title: '4-7-8 Breathing',
    subtitle: 'For Sleep',
    pattern: '4-7-8-0',
    description: 'Inhale for 4, hold for 7, exhale for 8. Acts as a natural tranquilizer for the nervous system.',
    color: ['#84FAB0', '#8FD3F4'],
  },
];

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME.colors.background, '#16213E']}
        style={styles.background}
      />
      <TopBar title="Explore" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Techniques</Text>

        {EXERCISES.map((exercise, index) => (
          <TouchableOpacity key={index} style={styles.cardContainer}>
            <BlurView intensity={20} style={styles.card}>
              <LinearGradient
                colors={exercise.color}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.iconPlaceholder}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{exercise.title}</Text>
                <Text style={styles.cardSubtitle}>{exercise.subtitle}</Text>
                <Text style={styles.cardDescription}>{exercise.description}</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 20,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: THEME.colors.secondary,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardDescription: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
});
