import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import newsletterRoutes from '../src/routes/newsletter';

describe('Newsletter Routes', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        app.register(newsletterRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should subscribe a valid email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/newsletter/subscribe',
            payload: { email: 'test.subscriber@example.com' }
        });
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ message: 'Successfully subscribed to the newsletter!' });
    });

    it('should reject an invalid email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/newsletter/subscribe',
            payload: { email: 'invalid-email' }
        });
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({ error: 'A valid email address is required.' });
    });
});
