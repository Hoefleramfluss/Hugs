"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const pos_1 = __importDefault(require("../src/routes/pos"));
(0, globals_1.describe)('POS Routes', () => {
    let app;
    const POS_API_KEY = 'test-pos-api-key';
    (0, globals_1.beforeAll)(async () => {
        process.env.POS_API_KEY = POS_API_KEY;
        app = (0, fastify_1.default)();
        await app.register(pos_1.default);
        await app.ready();
    });
    (0, globals_1.afterAll)(async () => {
        await app.close();
        delete process.env.POS_API_KEY;
    });
    (0, globals_1.it)('should return health status ok with correct api key', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/pos/health',
            headers: {
                'x-api-key': POS_API_KEY,
            },
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        (0, globals_1.expect)(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
    (0, globals_1.it)('should return 401 Unauthorized without api key', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/pos/health',
        });
        (0, globals_1.expect)(response.statusCode).toBe(401);
    });
    (0, globals_1.it)('should return 401 Unauthorized with incorrect api key', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/pos/health',
            headers: {
                'x-api-key': 'wrong-key',
            },
        });
        (0, globals_1.expect)(response.statusCode).toBe(401);
    });
    (0, globals_1.it)('should create a POS order with correct api key', async () => {
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
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        (0, globals_1.expect)(body.message).toContain('POS Order created successfully');
        (0, globals_1.expect)(body.id).toMatch(/^pos_order_/);
    });
});
//# sourceMappingURL=pos.test.js.map