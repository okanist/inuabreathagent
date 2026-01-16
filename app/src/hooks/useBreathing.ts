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
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [inhaleDur, holdInDur, exhaleDur, holdOutDur] = pattern;

    const stop = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsActive(false);
        setPhase('idle');
        setInstruction('Tap to Start');
    }, []);

    const runCycle = useCallback(() => {
        if (!isActive) return;

        // Inhale
        setPhase('inhale');
        setInstruction('Inhale');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        timeoutRef.current = setTimeout(() => {
            // Hold In
            if (holdInDur > 0) {
                setPhase('hold-in');
                setInstruction('Hold');
                Haptics.selectionAsync();
                timeoutRef.current = setTimeout(() => {
                    startExhale();
                }, holdInDur * 1000);
            } else {
                startExhale();
            }
        }, inhaleDur * 1000);
    }, [isActive, inhaleDur, holdInDur]);

    const startExhale = useCallback(() => {
        setPhase('exhale');
        setInstruction('Exhale');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        timeoutRef.current = setTimeout(() => {
            // Hold Out
            if (holdOutDur > 0) {
                setPhase('hold-out');
                setInstruction('Hold');
                timeoutRef.current = setTimeout(() => {
                    runCycle(); // Loop
                }, holdOutDur * 1000);
            } else {
                runCycle(); // Loop
            }
        }, exhaleDur * 1000);
    }, [exhaleDur, holdOutDur, runCycle]);

    useEffect(() => {
        if (isActive) {
            runCycle();
        } else {
            stop();
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isActive]); // runCycle is recursive, so we only trigger on isActive change initially

    const toggle = () => {
        setIsActive(!isActive);
    };

    return {
        phase,
        isActive,
        instruction,
        toggle,
        stop,
    };
};
