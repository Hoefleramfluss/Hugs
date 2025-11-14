import axios from 'axios';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token interceptor for protected AI routes
api.interceptors.request.use(config => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

/**
 * Generates a product description using the backend's AI service.
 * @param productName The name of the product.
 * @param keywords Keywords to guide the generation.
 * @returns The generated description string.
 */
export const generateProductDescription = async (productName: string, keywords: string): Promise<string> => {
    try {
        const response = await api.post('/api/ai/generate-description', {
            productName,
            keywords,
        });
        return response.data.description;
    } catch (error) {
        console.error("Failed to generate product description:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error || 'An error occurred while contacting the AI service.');
        }
        throw new Error('An unknown error occurred while generating description.');
    }
};
