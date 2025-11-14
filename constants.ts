const CLOUD_RUN_FALLBACK = process.env.NEXT_PUBLIC_API_URL || 'https://hugs-backend-prod-787273457651.europe-west3.run.app';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || CLOUD_RUN_FALLBACK;
export const SITE_NAME = 'Head & Growshop';
