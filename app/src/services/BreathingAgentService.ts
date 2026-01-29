// V2 Schema Types - Data now comes from Backend
interface BreathingPhases {
    inhale_sec: number;
    hold_in_sec: number;
    exhale_sec: number;
    hold_out_sec: number;
}

interface UITexts {
    inhale: string;
    hold_in: string;
    exhale: string;
    hold_out: string;
    bottom_sound_text: string | null;
}

interface BreathingTechnique {
    id: string;
    title: string;
    category: string;
    default_duration_sec: number;
    phases: BreathingPhases;
    ui_texts: UITexts;
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
    instruction_text?: string;  // Deterministic instruction from DB
    suggested_technique?: BreathingTechnique | null;
    suggested_technique_id?: string | null;
    duration_seconds?: number;
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

// Fallback patterns by technique ID (V2 schema)
export const TECHNIQUE_PATTERNS: Record<string, number[]> = {
    "box_breathing": [4, 4, 4, 4],
    "equal_breathing": [4, 0, 4, 0],
    "4_7_8_sleep": [4, 7, 8, 0],
    "physiological_sigh": [3, 0, 6, 0],
    "focus_cycle": [4, 4, 6, 2],
    "sip_breathing": [4, 0, 4, 0],
    "extended_exhale": [3, 0, 6, 0],
    "voo_chanting": [4, 0, 8, 0],
    "bee_breath": [4, 0, 8, 0]
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
     * Look up a technique by ID from TECHNIQUE_PATTERNS fallback.
     * Main data now comes from backend via callRemoteAgent.
     */
    static findTechniqueById(techId: string): number[] | null {
        if (!techId) return null;
        return TECHNIQUE_PATTERNS[techId] || null;
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
     * @deprecated Backend now handles all filtering via /api/agent/chat
     * This function is kept for offline fallback only.
     * Returns technique IDs that are generally safe.
     */
    static getSafeTechniqueIds(): string[] {
        // For offline fallback, return IDs known to be safe
        return Object.keys(TECHNIQUE_PATTERNS);
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
            prompt += `2. NEVER suggest forceful abdominal exhalations (Kapalabhati).\n\n`;
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
        // This is offline fallback - main flow uses callRemoteAgent

        // 1. Get Safe List (IDs only for offline fallback)
        const safeTechniqueIds = this.getSafeTechniqueIds();

        // 2. Construct Prompt
        const systemPrompt = this.generateSystemPrompt(userProfile);
        const userPrompt = `User Input: "${input}"\nAvailable Safe Techniques: ${safeTechniqueIds.join(', ')}`;

        // 3. Call LLM (Pseudo-code)
        console.log("Sending to LLM:", systemPrompt, userPrompt);

        // Mock Response - simplified for offline fallback
        return {
            message_for_user: "I hear that you're feeling overwhelmed. Let's take a moment to ground ourselves safely.",
            suggested_technique_id: "equal_breathing",
            duration_seconds: 120,
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
            // Priority: Environment Variable (Vercel/Prod) -> Localhost (Dev)
            // Note for Physical Android Devices: Change to your local IP (e.g. 192.168.1.11)
            // For Web: Use EXPO_PUBLIC_API_URL environment variable
            const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8001";
            const API_URL = `${BASE_URL}/api/agent/chat`;

            if (!process.env.EXPO_PUBLIC_API_URL) {
                console.debug("Using Dev API Fallback:", API_URL);
            }
            const response = await fetch(API_URL, {
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
                throw new Error(`Agent API Error: ${response.status}`);
            }

            const data = await response.json();
            console.log("\n🔵 --- AGENT RESPONSE (Frontend) ---");
            console.log(JSON.stringify(data, null, 2));
            console.log("-----------------------------------\n");

            return data as AgentResponse;

        } catch (error) {
            console.error("Failed to connect to Opik Agent Backend. Falling back to local offline mode.", error);
            // Fallback to local logic if backend is down
            return this.processUserInput(input, userProfile);
        }
    }
}
