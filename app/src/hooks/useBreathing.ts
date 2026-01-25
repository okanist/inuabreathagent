import { useState, useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

type Phase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle';

interface UseBreathingProps {
    pattern: number[]; // [inhale, hold-in, exhale, hold-out]
    onComplete?: () => void;
}

export const useBreathing = ({ pattern, onComplete }: UseBreathingProps) => {
    const [phase, setPhase] = useState<Phase>('idle');
    const [isActive, setIsActive] = useState(false);
    const [instruction, setInstruction] = useState('Tap to Start');
    const [timeLeft, setTimeLeft] = useState(0);

    const intervalRef = useRef<any>(null);
    const [inhaleDur, holdInDur, exhaleDur, holdOutDur] = pattern;

    const stop = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsActive(false);
        setPhase('idle');
        setInstruction('Tap to Start');
        setTimeLeft(0);
    }, []);

    const playHaptics = (phaseName: Phase) => {
        switch (phaseName) {
            case 'inhale':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                break;
            case 'hold-in':
            case 'hold-out':
                Haptics.selectionAsync();
                break;
            case 'exhale':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;
        }
    };

    const runCycle = useCallback(() => {
        // We will start fresh cycle logic here
        // Current phase tracking logic needs to be reset
        startPhase('inhale');
    }, [pattern]); // eslint-disable-line react-hooks/exhaustive-deps

    // Function to start a specific phase
    const startPhase = (newPhase: Phase) => {
        let duration = 0;
        let nextInstr = '';

        switch (newPhase) {
            case 'inhale':
                duration = inhaleDur;
                nextInstr = 'Inhale';
                break;
            case 'hold-in':
                duration = holdInDur;
                nextInstr = 'Hold';
                break;
            case 'exhale':
                duration = exhaleDur;
                nextInstr = 'Exhale';
                break;
            case 'hold-out':
                duration = holdOutDur;
                nextInstr = 'Hold';
                break;
            default:
                stop();
                return;
        }

        // Skip 0 duration phases instantly
        if (duration <= 0) {
            const next = getNextPhase(newPhase);
            startPhase(next);
            return;
        }

        setPhase(newPhase);
        setInstruction(nextInstr);
        setTimeLeft(duration);
        playHaptics(newPhase);
    };

    const getNextPhase = (current: Phase): Phase => {
        switch (current) {
            case 'inhale': return 'hold-in';
            case 'hold-in': return 'exhale';
            case 'exhale': return 'hold-out';
            case 'hold-out': return 'inhale';
            default: return 'idle';
        }
    };

    const timerRef = useRef<any>(null);

    // Main Engine: Drives the Phase Transitions with Precision
    useEffect(() => {
        if (!isActive || phase === 'idle') return;

        // Get current duration based on phase
        let duration = 0;
        if (phase === 'inhale') duration = inhaleDur;
        else if (phase === 'hold-in') duration = holdInDur;
        else if (phase === 'exhale') duration = exhaleDur;
        else if (phase === 'hold-out') duration = holdOutDur;

        // Safety: If somehow 0 duration phase is entered (should be skipped by startPhase), move next immediately
        if (duration <= 0) {
            const next = getNextPhase(phase);
            startPhase(next);
            return;
        }

        // Set precise timeout for the phase duration
        timerRef.current = setTimeout(() => {
            const next = getNextPhase(phase);
            startPhase(next);
        }, duration * 1000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [phase, isActive, inhaleDur, holdInDur, exhaleDur, holdOutDur]);

    // UI Clock: Updates the countdown (Visual Only)
    useEffect(() => {
        if (isActive && phase !== 'idle') {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => Math.max(0, prev - 1));
            }, 1000);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [phase, isActive]);

    // Start Trigger
    useEffect(() => {
        if (isActive && phase === 'idle') {
            runCycle();
        }
    }, [isActive, phase, runCycle]);

    // Watch for pattern changes while active to update live durations (optional but good)
    // For now, let's assume pattern change restarts or applies on next cycle.

    const toggle = () => {
        if (isActive) stop();
        else {
            setIsActive(true);
            setPhase('idle'); // Will trigger start in effect
        }
    };

    return {
        phase,
        isActive,
        instruction,
        timeLeft,
        toggle,
        stop,
    };
};
