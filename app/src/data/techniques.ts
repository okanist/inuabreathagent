/**
 * Local techniques DB (app/assets/data/all_db.json).
 * Used only as offline fallback when backend is unavailable; primary source is backend all_db.json.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALL_DB = require('../../assets/data/all_db.json') as {
    meta_info: { version?: string; language?: string; description?: string };
    techniques: RawTechnique[];
};

export interface BreathingPhases {
    inhale_sec: number;
    hold_in_sec: number;
    exhale_sec: number;
    hold_out_sec: number;
}

export interface UITexts {
    inhale?: string;
    hold_in?: string;
    exhale?: string;
    hold_out?: string;
    bottom_sound_text?: string | null;
}

export interface RawTechnique {
    id: string;
    title: string;
    category: string;
    default_duration_sec: number;
    screen_type: 'breathing' | 'screen2';
    agent_config?: { purpose?: string; instruction_clue?: string };
    context_rules?: Record<string, unknown>;
    phases: BreathingPhases;
    ui_texts: UITexts;
}

const techniques: RawTechnique[] = ALL_DB.techniques || [];

export function getTechniqueById(id: string): RawTechnique | null {
    if (!id) return null;
    return techniques.find((t) => t.id === id) ?? null;
}

export function getAllTechniques(): RawTechnique[] {
    return [...techniques];
}

export function getMetaInfo(): typeof ALL_DB.meta_info {
    return ALL_DB.meta_info || {};
}
