import { FastifyInstance } from 'fastify';

async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));
}

export default healthRoutes;
