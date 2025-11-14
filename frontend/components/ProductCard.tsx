import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
  const productImage = product.images?.[0];

  const handleQuickAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!defaultVariant) return;

    addToCart({
      id: defaultVariant.id,
      productId: product.id,
      title: product.title,
      sku: defaultVariant.sku,
      price: defaultVariant.priceOverride ?? product.price,
      quantity: 1,
      imageUrl: productImage?.url ?? 'https://placehold.co/400x400?text=No+Image',
    });
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      data-testid="product-card"
      className="group block overflow-hidden rounded-lg bg-surface shadow transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
    >
      <div className="relative w-full pt-[75%]">
        <Image
          src={productImage?.url ?? 'https://placehold.co/400x400?text=Product'}
          alt={productImage?.altText ?? product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 80vw"
          className="object-cover"
          priority={!!product.productOfWeek}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-300 group-hover:bg-black/50">
          <button
            type="button"
            onClick={handleQuickAdd}
            className="translate-y-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white opacity-0 shadow transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            Schnell hinzufügen
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="mb-1 truncate text-lg font-semibold text-on-surface">{product.title}</h3>
        <p className="text-xl font-bold text-primary">€{product.price.toFixed(2)}</p>
      </div>
    </Link>
  );
};

export default ProductCard;
