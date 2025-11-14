import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from '../constants';
import { Product } from '../types';
import fallbackProducts from '../data/fallback-products.json';

export const FALLBACK_PRODUCTS = fallbackProducts as Product[];

interface FetchOptions {
  timeoutMs?: number;
}

interface AbortSignalHandle {
  signal: AbortSignal;
  cleanup: () => void;
}

const abortSignalWithTimeout = AbortSignal as typeof AbortSignal & {
  timeout?: (ms: number) => AbortSignal;
};

const createAbortSignal = (timeoutMs: number): AbortSignalHandle => {
  if (typeof abortSignalWithTimeout.timeout === 'function') {
    const signal = abortSignalWithTimeout.timeout(timeoutMs);
    return { signal, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
};

export async function fetchProductsSafe(options: FetchOptions = {}): Promise<Product[]> {
  const { timeoutMs = API_TIMEOUT_MS } = options;
  const { signal, cleanup } = createAbortSignal(timeoutMs);

  try {
    const response = await axios.get<Product[]>(`${API_BASE_URL}/api/products`, {
      signal,
    });

    if (!Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('Invalid product response');
    }

    return response.data;
  } catch (error) {
    console.warn('Falling back to static product data due to fetch error:', error);
    return FALLBACK_PRODUCTS;
  } finally {
    cleanup();
  }
}

export async function fetchProductBySlugSafe(
  slug: string,
  options: FetchOptions = {},
): Promise<Product | undefined> {
  const products = await fetchProductsSafe(options);
  return products.find(product => product.slug === slug);
}

export async function fetchProductSlugsSafe(options: FetchOptions = {}): Promise<string[]> {
  const products = await fetchProductsSafe(options);
  return products.map(product => product.slug);
}
