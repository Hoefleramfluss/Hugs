import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface CheckoutSessionResponse {
    id: string;
    url: string;
}

export const createCheckoutSession = async (lineItems: any[]): Promise<CheckoutSessionResponse> => {
    const response = await api.post('/api/payments/create-checkout-session', { items: lineItems });
    return response.data;
};

export default {
    createCheckoutSession,
};
