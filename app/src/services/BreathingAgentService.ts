import techniquesDb from '../../assets/data/breathing_techniques_db.json';

// Types derived from the JSON structure
interface BreathingTechnique {
    name: string;
    mechanism: string;
    purpose: string;
    pregnancy_safety: {
        is_safe: boolean;
        reason?: string;
        alternative_ref?: string;
        modification?: string;
    };
}

interface UserProfile {
    is_pregnant: boolean;
    trimester?: number;
    current_time: string; // "HH:mm"
    emotional_state?: string;
    country_code?: string; // "US", "TR", "GB", etc.
}

interface AgentResponse {
    message_for_user?: string;
    suggested_technique?: BreathingTechnique | null;
    suggested_technique_id?: string | null;
    app_command?: {
        type: 'play_audio' | 'start_animation' | 'haptic_pattern';
        value: string;
    } | null;
    // Emergency Override Payload
    emergency_override?: {
        detected_category: 'MEDICAL_EMERGENCY' | 'SUICIDE';
        ui_action: 'show_fullscreen_sos';
        display_message: string;
        buttons: {
            label: string;
            action: 'call_phone' | 'share_location_whatsapp';
            number?: string;
        }[];
    };
}

const CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die",
    "overdose", "pills", "cut my wrists",
    "heart attack", "chest pain", "tightness in chest",
    "faint", "pass out",
    "rape", "assault", "violence",
    "not breathing", "baby not breathing", "choking",
    "ambulance", "911", "112", "emergency", "help me die"
];

const EMERGENCY_NUMBERS: Record<string, string> = {
    "US": "911", // USA
    "CA": "911", // Canada
    "GB": "999", // UK
    "TR": "112", // Turkey
    "EU": "112", // Europe (Generic)
    "AU": "000", // Australia
    "NZ": "111", // New Zealand
    "IN": "112", // India
};

export const TECHNIQUE_PATTERNS: Record<string, number[]> = {
    "Box Breathing": [4, 4, 4, 4],
    "Equal Breathing": [4, 0, 4, 0],
    "4-7-8 Technique": [4, 7, 8, 0],
    "Physiological Sigh": [3, 1, 6, 0], // Approximation: Inhale, short pause/2nd inhale, long exhale
    "Cardiac Coherence": [5, 0, 5, 0],
    "Triangle Breathing": [4, 4, 4, 0],
    "Relax Breathing": [4, 0, 6, 0],
    "Sheetali (Cooling Breath)": [4, 2, 4, 0],
    "Bhramari (Bee Breath)": [4, 0, 6, 0]
};

export const DEFAULT_PATTERN_FALLBACK = [4, 4, 4, 4];

export class BreathingAgentService {
    /**
     * Get localized emergency number
     */
    static getEmergencyNumber(countryCode: string | undefined): string {
        if (!countryCode) return "112"; // Default global GSM standard
        const code = countryCode.toUpperCase();
        return EMERGENCY_NUMBERS[code] || "112";
    }

    /**
     * STAGE 1: KEYWORD FILTER (REGEX/STRING MATCH)
     * Fast, zero-latency check.
     */
    static checkCrisisKeywords(input: string): boolean {
        const lowerInput = input.toLowerCase();
        return CRISIS_KEYWORDS.some(keyword => lowerInput.includes(keyword));
    }

    /**
     * STAGE 2: INTENT CLASSIFIER (MOCK LLM)
     * Decides if it's a real emergency or just a metaphor/false alarm.
     */
    static async checkCrisisIntent(input: string): Promise<{ isCrisis: boolean; category: 'MEDICAL_EMERGENCY' | 'SUICIDE' | 'NONE' }> {
        // In a real app, this would call a lightweight LLM (GPT-4o-mini).
        // Here we mock it based on keywords for demonstration.

        const lowerInput = input.toLowerCase();

        if (lowerInput.includes("suicide") || lowerInput.includes("kill myself") || lowerInput.includes("die")) {
            return { isCrisis: true, category: 'SUICIDE' };
        }
        if (lowerInput.includes("heart attack") || lowerInput.includes("chest pain") || lowerInput.includes("ambulance")) {
            return { isCrisis: true, category: 'MEDICAL_EMERGENCY' };
        }

        // If caught by keywords but not specific enough here, we err on side of caution or let main agent handle mild cases.
        // For this demo, let's say if it passed Stage 1, we treat it seriously unless clearly benign.
        return { isCrisis: false, category: 'NONE' };
    }


    /**
     * THE SAFETY GUARD
     * Filters out forbidden techniques based on user profile.
     */
    static getSafeTechniques(userProfile: UserProfile): BreathingTechnique[] {
        const allTechniques: BreathingTechnique[] = [];

        // Flatten techniques from all categories
        techniquesDb.breathing_techniques_db.categories.forEach(cat => {
            allTechniques.push(...(cat.techniques as BreathingTechnique[]));
        });

        if (!userProfile.is_pregnant) {
            return allTechniques;
        }

        // Filter for pregnancy safety
        return allTechniques.filter(tech => {
            // 1. Check explicit "is_safe" flag
            if (tech.pregnancy_safety.is_safe) return true;

            // 2. Check if there is a modification allowed (e.g., "don't squeeze belly")
            // If modification is present, it might be considered conditionally safe, 
            // but strictly speaking, we might want to prioritize fully safe ones.
            // For this guardrail, we will be strict:
            if (tech.pregnancy_safety.is_safe === false) {
                console.log(`[SafetyGuard] Excluded ${tech.name}: ${tech.pregnancy_safety.reason}`);
                return false;
            }
            return true;
        });
    }

    /**
     * THE ORCHESTRATOR
     * Generates the prompt for the Brain (LLM).
     */
    static generateSystemPrompt(userProfile: UserProfile): string {
        let prompt = `Role: You are the world's leading Somatic Breath Coach. Your tone is empathetic, grounding, and clear.\n\n`;

        prompt += `PRIME DIRECTIVE (NEVER VIOLATE):\n`;
        prompt += `If the user mentions self-harm, suicide, harming others, or medical emergencies (heart attack, severe bleeding, etc.):\n`;
        prompt += `1. NEVER suggest breathing exercises.\n`;
        prompt += `2. NEVER suggest breath retention (Kumbhaka).\n`; // Merged safety constraint implicitly
        prompt += `2. NEVER attempt therapy.\n`;
        prompt += `3. State only advice to seek professional or medical help immediately.\n`;
        prompt += `4. Set 'emergency_flag: true' in response.\n\n`;

        if (userProfile.is_pregnant) {
            prompt += `CRITICAL SAFETY CONSTRAINTS (User is Pregnant - Trimester ${userProfile.trimester || '?'}):\n`;
            prompt += `1. NEVER suggest breath retention (Kumbhaka).\n`;
            prompt += `2. NEVER suggest forceful abdominal exhalations (Kapalabhati).\n`;
            prompt += `3. REPLACE "Box Breathing" with "Equal Breathing".\n`;
            prompt += `4. REPLACE "4-7-8" with "4-6 (no hold)".\n\n`;
        }

        prompt += `OUTPUT FORMAT:\nJSON only: { "message_for_user": "...", "suggested_technique_id": "...", "app_command": {...} }`;
        return prompt;
    }

    /**
     * Main Process Function
     */
    static async processUserInput(input: string, userProfile: UserProfile): Promise<AgentResponse> {

        // --- STAGE 1: KEYWORD CHECK ---
        if (this.checkCrisisKeywords(input)) {
            console.warn("Crisis Keyword Detected! Escalating to Intent Classifier...");

            // --- STAGE 2: INTENT CLASSIFICATON ---
            const intent = await this.checkCrisisIntent(input);

            if (intent.isCrisis) {
                console.error(`CRITICAL: ${intent.category} detected. Triggering Emergency Override.`);

                const emergencyNumber = this.getEmergencyNumber(userProfile.country_code);

                return {
                    emergency_override: {
                        detected_category: intent.category as 'MEDICAL_EMERGENCY' | 'SUICIDE',
                        ui_action: 'show_fullscreen_sos',
                        display_message: intent.category === 'SUICIDE'
                            ? "You are not alone. Please reach out for help immediately."
                            : `This sounds like a medical emergency. Please call ${emergencyNumber} immediately.`,
                        buttons: [
                            {
                                label: `Call Emergency (${emergencyNumber})`,
                                action: 'call_phone',
                                number: emergencyNumber
                            },
                            {
                                label: "Share Location",
                                action: 'share_location_whatsapp'
                            }
                        ]
                    }
                };
            }
        }

        // --- STAGE 3: MAIN BRAIN (Standard Flow) ---

        // 1. Get Safe List
        const safeTechniques = this.getSafeTechniques(userProfile);

        // 2. Construct Prompt
        const systemPrompt = this.generateSystemPrompt(userProfile);
        const userPrompt = `User Input: "${input}"\nAvailable Safe Techniques: ${safeTechniques.map(t => t.name).join(', ')}`;

        // 3. Call LLM (Pseudo-code)
        console.log("Sending to LLM:", systemPrompt, userPrompt);

        // Mock Response
        return {
            message_for_user: "I hear that you're feeling overwhelmed. Let's take a moment to ground ourselves safely.",
            suggested_technique: safeTechniques.find(t => t.name === "Physiological Sigh") || null,
            app_command: {
                type: 'start_animation',
                value: 'calm_waves'
            }
        };
    }

    /**
     * INTEGRATION: Call the Python Backend (Opik Enabled)
     * Use this method when running the backend server for full Opik tracing.
     */
    static async callRemoteAgent(input: string, userProfile: UserProfile): Promise<AgentResponse> {
        try {
            const response = await fetch('http://localhost:8001/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_input: input,
                    user_profile: {
                        is_pregnant: userProfile.is_pregnant,
                        trimester: userProfile.trimester,
                        current_time: userProfile.current_time,
                        country_code: userProfile.country_code || "TR"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Backend Error: ${response.status}`);
            }

            const data = await response.json();
            return data as AgentResponse;

        } catch (error) {
            console.error("Failed to connect to Opik Agent Backend. Falling back to local offline mode.", error);
            // Fallback to local logic if backend is down
            return this.processUserInput(input, userProfile);
        }
    }
}
