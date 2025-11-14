import { FastifyInstance } from 'fastify';
import { createStripeCheckoutSession } from '../lib/paymentProcessor';

// Define a type for the request body for better type safety
interface CreateCheckoutBody {
    items: any[]; // In a real app, define a stricter type for line items
}

async function paymentsRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: CreateCheckoutBody }>('/api/payments/create-checkout-session', async (request, reply) => {
        const { items } = request.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return reply.code(400).send({ error: 'Invalid line items provided.' });
        }

        // The frontend should provide success/cancel URLs or we can construct them.
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseUrl}/checkout/cancel`;

        try {
            const session = await createStripeCheckoutSession(items, successUrl, cancelUrl);
            return { id: session.id, url: session.url };
        } catch (error) {
            fastify.log.error(error, 'Failed to create checkout session');
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
}

export default paymentsRoutes;
