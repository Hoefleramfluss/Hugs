import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
// FIX: Add side-effect import to ensure fastify types are available for module augmentation.
import 'fastify';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

const redisPlugin: FastifyPluginAsync = fp(async (server, options) => {
  // In a real app, connection details would come from config
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  server.decorate('redis', redis);

  server.addHook('onClose', async (server) => {
    await server.redis.quit();
  });
});

export default redisPlugin;