import axios from 'axios';
import { API_URL } from '../constants/config';

export interface Intervention {
    title: string;
    pattern: number[];
    duration_seconds: number;
    animation_type: string;
}

export interface AnalysisResponse {
    analysis: string;
    intervention: Intervention;
    safety_flag: boolean;
}

export const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const analyzeLoad = async (text: string, context: string = 'day', heart_rate: number = 0, is_pregnant: boolean = false): Promise<AnalysisResponse> => {
    try {
        const response = await api.post<AnalysisResponse>('/analyze-load', {
            text,
            context,
            heart_rate,
            is_pregnant,
        });
        return response.data;
    } catch (error) {
        console.error('API Error:', error);
        if (axios.isAxiosError(error) && error.message === 'Network Error') {
            throw new Error('Network error: Ensure the backend server is running and accessible.');
        }
        throw error;
    }
};
