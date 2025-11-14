import React, { useEffect, useState } from 'react';
// FIX: Adjusted import paths to be relative to the project root.
import { Product } from '../../frontend/types';
import api from '../../frontend/services/api';
import ProductCard from '../../frontend/components/ProductCard';

interface ProductGridSectionProps {
  title: string;
  limit?: number;
}

const ProductGridSection: React.FC<ProductGridSectionProps> = ({
  title = "Featured Products",
  limit = 4,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const allProducts = await api.getProducts();
        setProducts(allProducts.slice(0, limit));
      } catch (error) {
        console.error("Failed to fetch products for grid:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [limit]);

  if (loading) {
    return (
        <div className="py-16 text-center">
            <p>Loading products...</p>
        </div>
    );
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductGridSection;
