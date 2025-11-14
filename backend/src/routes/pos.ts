import { FastifyInstance } from 'fastify';
import { authenticatePOS } from '../lib/posAuth';

async function posRoutes(fastify: FastifyInstance) {
    // A simple endpoint to verify POS connection
    fastify.get('/api/pos/health', { preHandler: [authenticatePOS] }, async (request, reply) => {
        return { status: 'ok' };
    });

    // Endpoint for a POS device to create an order
    fastify.post<{ Body: { items: { sku: string, quantity: number }[], locationId: string } }>(
        '/api/pos/orders',
        { preHandler: [authenticatePOS] },
        async (request, reply) => {
            const { items, locationId } = request.body;

            if (!items || !locationId || items.length === 0) {
                return reply.code(400).send({ error: 'Invalid order data' });
            }
            
            // This is a complex transaction in a real app.
            // 1. Validate SKUs and locationId
            // 2. Check stock availability at the given location
            // 3. Decrease stock
            // 4. Calculate total price
            // 5. Create an Order record
            // 6. Return order details
            
            // For this stub, we'll just log and return success
            // Fix: Use structured logging format for fastify.log
            fastify.log.info({ items }, `POS Order received for location ${locationId}`);
            
            // Placeholder: In a real app, you'd run this in a transaction
            // and create a proper order record.
            return {
                id: `pos_order_${Date.now()}`,
                message: 'POS Order created successfully (simulated)',
                items,
            };
        }
    );
}

export default posRoutes;