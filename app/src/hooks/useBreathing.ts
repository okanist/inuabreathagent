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

    // The Tick Effect
    useEffect(() => {
        if (isActive) {
            // Start the cycle if just activated and sitting at idle
            if (phase === 'idle') {
                runCycle();
            }

            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev > 1) {
                        return prev - 1;
                    } else {
                        // Time is up for current phase
                        // We need to transition. 
                        // NOTE: State updates inside setter might be tricky if we need `phase`
                        // So we use a ref or rely on the effect dependency to restart/check.
                        // Actually, simplified: we check phase in the effect closure? No, stale closure.
                        // Better to rely on a separate effect or use refs for current phase.
                        // Let's keep it simple: We use a separate effect for the interval? 
                        // Or use refs for mutable variables that don't trigger re-renders.
                        return 0;
                    }
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive]);

    // Phase transition effect - watches timeLeft hitting 0
    useEffect(() => {
        if (isActive && timeLeft === 0 && phase !== 'idle') {
            const next = getNextPhase(phase);
            startPhase(next);
        }
    }, [timeLeft, isActive, phase]); // Dependencies ensure we transition when time hits 0

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
