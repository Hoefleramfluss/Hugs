import axios from 'axios';
// Fix: Use aliased path for consistency
import { Page, Section } from '../types';
import { API_BASE_URL, API_TIMEOUT_MS } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export const getPageBySlug = async (slug: string): Promise<Page> => {
    const response = await api.get(`/api/pages/${slug}`);
    return response.data;
};

export const updatePageSections = async (slug: string, sections: Section[]): Promise<Page> => {
    const response = await api.put(`/api/pages/${slug}`, { sections });
    return response.data;
};

export default {
    getPageBySlug,
    updatePageSections,
};
