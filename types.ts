// This file contains types shared across the client-side application.

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
}

export interface Product {
  id:string;
  title: string;
  slug: string;
  description: string;
  price: number;
  images: ProductImage[];
  variants: ProductVariant[];
  productOfWeek: boolean;
}

export interface Section {
  id: string;
  type: string;
  props: { [key: string]: any };
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
}
