import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import paymentsRoutes from '../src/routes/payments';

// Mock the stripe client
// Fix: Use mockImplementation with Promise.resolve to fix type inference issue with mockResolvedValue.
jest.mock('../src/lib/paymentProcessor', () => ({
  createStripeCheckoutSession: jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    })
  ),
}));

describe('Payments Routes', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        app.register(paymentsRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should create a checkout session for valid items', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/payments/create-checkout-session',
            payload: {
                items: [{ price_data: { currency: 'eur', product_data: { name: 'Test Item'}, unit_amount: 1000}, quantity: 1 }]
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.id).toBe('cs_test_123');
        expect(body.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    });

    it('should return 400 for missing items', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/payments/create-checkout-session',
            payload: {}
        });
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 for empty items array', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/payments/create-checkout-session',
            payload: { items: [] }
        });
        expect(response.statusCode).toBe(400);
    });
});