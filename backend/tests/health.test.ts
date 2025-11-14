import { describe, it, expect } from '@jest/globals';
import Fastify from 'fastify';
import healthRoutes from '../src/routes/health';

describe('GET /api/healthz', () => {
  it('returns ok payload', async () => {
    const app = Fastify();
    await app.register(healthRoutes);

    const response = await app.inject({ method: 'GET', url: '/api/healthz' });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload).toHaveProperty('status', 'ok');
    expect(payload).toHaveProperty('timestamp');

    await app.close();
  });
});
