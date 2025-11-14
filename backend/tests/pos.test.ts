import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import posRoutes from '../src/routes/pos';

describe('POS Routes', () => {
    let app: FastifyInstance;
    const POS_API_KEY = 'test-pos-api-key';

    beforeAll(async () => {
        process.env.POS_API_KEY = POS_API_KEY;
        app = Fastify();
        await app.register(posRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
        delete process.env.POS_API_KEY;
    });

    it('should return health status ok with correct api key', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/pos/health',
            headers: {
                'x-api-key': POS_API_KEY,
            },
        });
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });

    it('should return 401 Unauthorized without api key', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/pos/health',
        });
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 Unauthorized with incorrect api key', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/pos/health',
            headers: {
                'x-api-key': 'wrong-key',
            },
        });
        expect(response.statusCode).toBe(401);
    });

    it('should create a POS order with correct api key', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/pos/orders',
            headers: {
                'x-api-key': POS_API_KEY,
            },
            payload: {
                items: [{ sku: 'TEST-SKU', quantity: 2 }],
                locationId: 'loc-123',
            }
        });
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.message).toContain('POS Order created successfully');
        expect(body.id).toMatch(/^pos_order_/);
    });
});
