"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const auth_1 = __importDefault(require("../src/routes/auth"));
const prisma_1 = __importDefault(require("../src/plugins/prisma"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
// This is a simplified test setup. A real app would use a separate test database.
(0, globals_1.describe)('Auth Routes', () => {
    let app;
    let prisma;
    (0, globals_1.beforeAll)(async () => {
        app = (0, fastify_1.default)();
        app.register(jwt_1.default, { secret: 'test-secret' });
        app.register(prisma_1.default);
        app.register(auth_1.default);
        await app.ready();
        prisma = app.prisma;
        // Clean up user before tests
        await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    });
    (0, globals_1.afterAll)(async () => {
        // Clean up created user
        await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
        await app.close();
    });
    (0, globals_1.it)('should register a new user', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        (0, globals_1.expect)(body).toHaveProperty('token');
    });
    (0, globals_1.it)('should not register a user with an existing email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: {
                email: 'test@example.com',
                password: 'password123',
                name: 'Another Test User'
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(409);
    });
    (0, globals_1.it)('should log in an existing user', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: 'test@example.com',
                password: 'password123',
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        (0, globals_1.expect)(body).toHaveProperty('token');
        (0, globals_1.expect)(body.user.email).toBe('test@example.com');
    });
    (0, globals_1.it)('should not log in with incorrect password', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: 'test@example.com',
                password: 'wrongpassword',
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(401);
    });
});
//# sourceMappingURL=auth.test.js.map