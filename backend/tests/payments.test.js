"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const payments_1 = __importDefault(require("../src/routes/payments"));
// Mock the stripe client
// Fix: Use mockImplementation with Promise.resolve to fix type inference issue with mockResolvedValue.
globals_1.jest.mock('../src/lib/paymentProcessor', () => ({
    createStripeCheckoutSession: globals_1.jest.fn().mockImplementation(() => Promise.resolve({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    })),
}));
(0, globals_1.describe)('Payments Routes', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = (0, fastify_1.default)();
        app.register(payments_1.default);
        await app.ready();
    });
    (0, globals_1.afterAll)(async () => {
        await app.close();
    });
    (0, globals_1.it)('should create a checkout session for valid items', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/payments/create-checkout-session',
            payload: {
                items: [{ price_data: { currency: 'eur', product_data: { name: 'Test Item' }, unit_amount: 1000 }, quantity: 1 }]
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        (0, globals_1.expect)(body.id).toBe('cs_test_123');
        (0, globals_1.expect)(body.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    });
    (0, globals_1.it)('should return 400 for missing items', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/payments/create-checkout-session',
            payload: {}
        });
        (0, globals_1.expect)(response.statusCode).toBe(400);
    });
    (0, globals_1.it)('should return 400 for empty items array', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/payments/create-checkout-session',
            payload: { items: [] }
        });
        (0, globals_1.expect)(response.statusCode).toBe(400);
    });
});
//# sourceMappingURL=payments.test.js.map