const PROD_CLOUD_RUN_URL = 'https://hugs-backend-prod-787273457651.europe-west3.run.app';
const PROD_FRONTEND_URL = 'https://hugs.garden';

const sanitizeUrl = (value?: string | null) => {
  if (!value) return undefined;
  return value.trim().replace(/\/+$/, '');
};

const configuredApiUrl = sanitizeUrl(process.env.NEXT_PUBLIC_API_URL);
const configuredSiteUrl =
  sanitizeUrl(process.env.NEXT_PUBLIC_SITE_URL) || sanitizeUrl(process.env.VERCEL_URL);
const configuredRevalidate = Number(process.env.NEXT_REVALIDATE_SECONDS ?? 60);

export const API_BASE_URL = configuredApiUrl || PROD_CLOUD_RUN_URL;
export const PUBLIC_FALLBACK_API_URL = PROD_CLOUD_RUN_URL;
export const API_TIMEOUT_MS = 1_000;
export const DEFAULT_REVALIDATE_SECONDS =
  Number.isFinite(configuredRevalidate) && configuredRevalidate > 0 ? configuredRevalidate : 60;
export const SITE_ORIGIN = configuredSiteUrl || PROD_FRONTEND_URL;
export const CANONICAL_BASE_URL = SITE_ORIGIN.replace(/\/+$/, '');
export const DEFAULT_META_DESCRIPTION =
  'Hugs Garden supplies premium growshop equipment, nutrients, and expert advice for thriving indoor gardens.';
export const DEFAULT_TITLE = 'Hugs Garden Growshop | Premium Indoor Gardening Supplies';
export const DEFAULT_CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://hugs-backend-prod-787273457651.europe-west3.run.app; img-src 'self' data: https://placehold.co https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";

export const withApiBasePath = (path = ''): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
