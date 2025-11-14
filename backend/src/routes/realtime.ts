import { FastifyInstance } from 'fastify';
import { PubSub } from '../lib/pubsub';

// This is a simple in-memory pubsub for demonstration.
// In production, you would use Redis or another message broker.
const pubsub = new PubSub();

// Simulate a stock update event every 10 seconds
setInterval(() => {
    const payload = {
        type: 'STOCK_UPDATE',
        data: {
            sku: `SKU-${Math.floor(Math.random() * 10) + 1}`,
            newQuantity: Math.floor(Math.random() * 100),
            timestamp: new Date().toISOString(),
        }
    };
    pubsub.publish('realtime_events', JSON.stringify(payload));
}, 10000);


async function realtimeRoutes(fastify: FastifyInstance) {
    fastify.get('/api/realtime/sse', async (request, reply) => {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.flushHeaders();

        const handler = (message: string) => {
            reply.raw.write(`data: ${message}\n\n`);
        };

        pubsub.subscribe('realtime_events', handler);

        // Clean up when client disconnects
        request.raw.on('close', () => {
            pubsub.unsubscribe('realtime_events', handler);
            fastify.log.info('SSE client disconnected');
        });

        // The reply is sent over time, so we don't call reply.send() here.
        // We need to keep the connection open.
    });
}

export default realtimeRoutes;
