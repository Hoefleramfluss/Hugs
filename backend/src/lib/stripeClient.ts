import Stripe from 'stripe';
import { config } from '../config';

if (!config.stripeSecretKey) {
  throw new Error('Stripe secret key is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
}

export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2024-06-20',
});
