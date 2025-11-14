import axios from 'axios';
import { Page, Product, User } from '../types';
import { API_BASE_URL, API_TIMEOUT_MS } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(config => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});


// Authentication
export const login = async (credentials: Pick<User, 'email' | 'password'>): Promise<{ token: string, user: User }> => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
};

export const register = async (userData: Pick<User, 'email' | 'password' | 'name'>): Promise<{ token: string }> => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
};


// Products
export const getProducts = async (): Promise<Product[]> => {
    const response = await api.get('/api/products');
    return Array.isArray(response.data) ? response.data : [];
};

export const getProductBySlug = async (slug: string): Promise<Product> => {
    const response = await api.get(`/api/products/${slug}`);
    return response.data;
};

export const getProductOfWeek = async (): Promise<Product> => {
    const response = await api.get('/api/products/pdw');
    return response.data;
}

export const setProductOfWeek = async (productId: string): Promise<Product> => {
    const response = await api.post('/api/products/pdw', { productId });
    return response.data;
};

// Pages / Website Builder
export const getPages = async (): Promise<Page[]> => {
    const response = await api.get('/api/pages');
    return response.data;
};

export const getPageBySlug = async (slug: string): Promise<Page> => {
    const response = await api.get(`/api/pages/${slug}`);
    return response.data;
};

export const updatePageSections = async (slug: string, sections: Page['sections']): Promise<Page> => {
    const response = await api.put(`/api/pages/${slug}`, { sections });
    return response.data;
};


export default {
    login,
    register,
    getProducts,
    getProductBySlug,
    getProductOfWeek,
    setProductOfWeek,
    getPages,
    getPageBySlug,
    updatePageSections,
};
