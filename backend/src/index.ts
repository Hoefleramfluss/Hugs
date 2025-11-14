import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { config } from './config';
import prismaPlugin from './plugins/prisma';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import inventoryRoutes from './routes/inventory';
import orderRoutes from './routes/orders';
import posRoutes from './routes/pos';
import realtimeRoutes from './routes/realtime';
import pageRoutes from './routes/pages';
import aiRoutes from './routes/ai';
import paymentsRoutes from './routes/payments';
import stripeWebhookRoutes from './routes/webhooks/stripe';
import settingsRoutes from './routes/settings';
import customerRoutes from './routes/customers';
import newsletterRoutes from './routes/newsletter';
import seoRoutes from './routes/seo';
import reviewRoutes from './routes/reviews';
import questionRoutes from './routes/questions';
import shipmentRoutes from './routes/shipments';
import returnRoutes from './routes/returns';
import dashboardRoutes from './routes/dashboard';
import { exit } from 'node:process';
import healthRoutes from './routes/health';


const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

/**
 * Main function to initialize and start the Fastify server.
 */
async function main() {
  // Plugins
  await server.register(fastifyCors, {
    origin: '*', // Be more restrictive in production
  });

  await server.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  await server.register(prismaPlugin);

  // Routes
  await server.register(authRoutes);
  await server.register(healthRoutes);
  await server.register(productRoutes);
  await server.register(inventoryRoutes);
  await server.register(orderRoutes);
  await server.register(posRoutes);
  await server.register(realtimeRoutes);
  await server.register(pageRoutes);
  await server.register(aiRoutes);
  await server.register(paymentsRoutes);
  await server.register(stripeWebhookRoutes);
  await server.register(settingsRoutes);
  await server.register(customerRoutes);
  await server.register(newsletterRoutes);
  await server.register(seoRoutes);
  await server.register(reviewRoutes);
  await server.register(questionRoutes);
  await server.register(shipmentRoutes);
  await server.register(returnRoutes);
  await server.register(dashboardRoutes);

  try {
    const address = await server.listen({ port: config.port as number, host: '0.0.0.0' });
    console.log(`Server listening at ${address}`);
  } catch (err) {
    server.log.error(err);
    // Fix: Use imported 'exit' to resolve 'Property 'exit' does not exist on type 'Process'.' error.
    exit(1);
  }
}

main();
