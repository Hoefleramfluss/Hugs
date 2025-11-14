export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  priceOverride?: number;
  stock?: number;
  attributes?: Record<string, any>;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  images: ProductImage[];
  variants: ProductVariant[];
  productOfWeek: boolean;
}

export interface CartItem {
    id: string; // This is the variant ID
    productId: string;
    title: string;
    sku: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

export interface Section {
  id: string;
  type: string;
  props: { [key: string]: any };
  order?: number;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
}

export interface User {
    id: string;
    email: string;
    name?: string;
    // Fix: Add optional password to be used for auth-related API call types.
    password?: string;
    role: 'ADMIN' | 'USER';
}

export interface Customer {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    orders?: any[]; // Define Order type if needed
}
