import { stripe } from './stripeClient';

// This is a simplified interface for line items for Stripe Checkout
interface LineItem {
    price_data: {
        currency: string;
        product_data: {
            name: string;
            images?: string[];
        };
        unit_amount: number; // in cents
    };
    quantity: number;
}

export async function createStripeCheckoutSession(lineItems: LineItem[], successUrl: string, cancelUrl: string) {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'ideal'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
        return session;
    } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        throw new Error('Could not create payment session.');
    }
}
