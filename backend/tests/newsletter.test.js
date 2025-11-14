"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const newsletter_1 = __importDefault(require("../src/routes/newsletter"));
(0, globals_1.describe)('Newsletter Routes', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = (0, fastify_1.default)();
        app.register(newsletter_1.default);
        await app.ready();
    });
    (0, globals_1.afterAll)(async () => {
        await app.close();
    });
    (0, globals_1.it)('should subscribe a valid email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/newsletter/subscribe',
            payload: { email: 'test.subscriber@example.com' }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        (0, globals_1.expect)(JSON.parse(response.body)).toEqual({ message: 'Successfully subscribed to the newsletter!' });
    });
    (0, globals_1.it)('should reject an invalid email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/newsletter/subscribe',
            payload: { email: 'invalid-email' }
        });
        (0, globals_1.expect)(response.statusCode).toBe(400);
        (0, globals_1.expect)(JSON.parse(response.body)).toEqual({ error: 'A valid email address is required.' });
    });
});
//# sourceMappingURL=newsletter.test.js.map