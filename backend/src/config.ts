import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'supersecret',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
};
