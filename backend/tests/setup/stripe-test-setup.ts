import { jest } from '@jest/globals';

/**
 * Jest setup: mock Stripe so tests never hit the real API.
 * This mock matches the usage pattern:
 *   const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '...' });
 *   stripe.checkout.sessions.create(...)
 */
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      checkout: {
        sessions: {
          create: jest.fn<
            () => Promise<{ id: string; url: string }>
          >().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/c/pay/cs_test_123',
          }),
        },
      },
    };
  });
});
