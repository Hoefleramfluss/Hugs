import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
// FIX: Using named import for Prisma Client to resolve module resolution issues.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import authRoutes from '../src/routes/auth';
import prismaPlugin from '../src/plugins/prisma';
import fastifyJwt from '@fastify/jwt';

// This is a simplified test setup. A real app would use a separate test database.
describe('Auth Routes', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;

    beforeAll(async () => {
        app = Fastify();
        app.register(fastifyJwt, { secret: 'test-secret' });
        app.register(prismaPlugin);
        app.register(authRoutes);
        await app.ready();
        prisma = app.prisma;

        // Clean up user before tests
        if (prisma?.user) {
            await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
        }
    });

    afterAll(async () => {
        // Clean up created user
        if (prisma?.user) {
            await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
        }
        await app.close();
    });

    it('should register a new user', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('token');
    });

    it('should not register a user with an existing email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: {
                email: 'test@example.com',
                password: 'password123',
                name: 'Another Test User'
            }
        });

        expect(response.statusCode).toBe(409);
    });

    it('should log in an existing user', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: 'test@example.com',
                password: 'password123',
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('token');
        expect(body.user.email).toBe('test@example.com');
    });

    it('should not log in with incorrect password', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: 'test@example.com',
                password: 'wrongpassword',
            }
        });

        expect(response.statusCode).toBe(401);
    });
});