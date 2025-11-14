import fallbackProductsJson from '../data/fallback-products.json';
import { Product } from '../types';
import { fetchProductBySlugSafe, fetchProductsSafe } from './apiSafeFetch';

const fallbackProducts = fallbackProductsJson as Product[];

export const getFallbackProducts = (): Product[] => fallbackProducts;

export const getFallbackProductBySlug = (slug: string): Product | undefined =>
  fallbackProducts.find(product => product.slug === slug);

export async function fetchProductsWithFallback(): Promise<Product[]> {
  const products = await fetchProductsSafe();
  return products.length > 0 ? products : fallbackProducts;
}

export async function fetchProductBySlugWithFallback(slug: string): Promise<Product | undefined> {
  const product = await fetchProductBySlugSafe(slug);
  return product ?? getFallbackProductBySlug(slug);
}
