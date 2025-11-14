import { FastifyInstance, FastifyRequest } from 'fastify';
import { stripe } from '../../lib/stripeClient';
import Stripe from 'stripe';
// FIX: Import Buffer to resolve 'Cannot find name 'Buffer'' error.
import { Buffer } from 'node:buffer';

async function stripeWebhookRoutes(fastify: FastifyInstance) {
    fastify.post('/api/webhooks/stripe', {
        // We need the raw body to verify the webhook signature
        config: {
            rawBody: true,
        }
    }, async (request: FastifyRequest<{ Body: any }>, reply) => {
        const sig = request.headers['stripe-signature'] as string;
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

        if (!sig || !endpointSecret) {
            fastify.log.warn('Stripe webhook signature or secret missing.');
            return reply.code(400).send('Webhook Error: Missing signature or secret.');
        }

        let event: Stripe.Event;

        try {
            // Fix: This seems to be a type definition issue. request.rawBody is available when rawBody: true is set in route config.
            // Using 'as any' to bypass the incorrect type error.
            event = stripe.webhooks.constructEvent((request as any).rawBody as Buffer, sig, endpointSecret);
        } catch (err: any) {
            fastify.log.error(`Stripe webhook signature error: ${err.message}`);
            return reply.code(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                // Fulfill the purchase...
                // e.g., update order status in the database, decrease stock, send confirmation email.
                fastify.log.info(`Payment successful for session: ${session.id}`);
                // You would typically retrieve customer and order details from the session object.
                // const customerDetails = session.customer_details;
                // const orderId = session.metadata?.orderId; // if you pass it during session creation
                break;
            // ... handle other event types
            default:
                fastify.log.info(`Unhandled Stripe event type: ${event.type}`);
        }

        // Return a 200 response to acknowledge receipt of the event
        reply.send({ received: true });
    });
}

export default stripeWebhookRoutes;