import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types';
import api from '../frontend/services/api';
import { useCart } from '../frontend/context/CartContext';
import RecommendedSlider from '../frontend/components/RecommendedSlider';
import Header from '../frontend/components/Header';
import Footer from '../frontend/components/Footer';

interface ProductPageProps {
  slug: string;
}

const ProductPage: React.FC<ProductPageProps> = ({ slug }) => {
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  useEffect(() => {
    const fetchProduct = async () => {
        if (!slug) return;
        try {
            setLoading(true);
            const productData = await api.getProductBySlug(slug);
            setProduct(productData);

            const allProducts = await api.getProducts();
            const related = allProducts.filter(p => p.id !== productData.id).slice(0, 4);
            setRelatedProducts(related);
            
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Product not found.');
        } finally {
            setLoading(false);
        }
    };
    fetchProduct();
  }, [slug]);

  const selectedVariant = product?.variants[0];

  const handleAddToCart = () => {
    if (product && selectedVariant) {
        addToCart({
            id: selectedVariant.id,
            productId: product.id,
            title: product.title,
            sku: selectedVariant.sku,
            price: selectedVariant.priceOverride ?? product.price,
            quantity: quantity,
            imageUrl: product.images?.[0]?.url,
        });
    }
  };

  if (loading) {
    return (
        <div className="bg-background">
            <Header />
            <main className="container mx-auto px-4 py-16 text-center">Loading product...</main>
            <Footer />
        </div>
    );
  }
  if (error) {
    return (
        <div className="bg-background">
            <Header />
            <main className="container mx-auto px-4 py-16 text-center text-red-500">{error}</main>
            <Footer />
        </div>
    );
  }
  if (!product) return null;

  return (
    <div className="bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <img
              src={product.images?.[0]?.url || 'https://placehold.co/600x600?text=Product'}
              alt={product.title}
              width={600}
              height={600}
              className="w-full h-auto object-cover rounded-lg shadow-lg"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
            <p className="text-3xl font-bold text-primary mb-6">€{product.price.toFixed(2)}</p>
            <p className="text-on-surface-variant mb-6">{product.description}</p>
            <div className="flex items-center gap-4 mb-6">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                className="w-20 p-2 border rounded-md"
              />
              <button onClick={handleAddToCart} className="flex-grow bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-md">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
        {relatedProducts.length > 0 && <RecommendedSlider products={relatedProducts} />}
      </main>
      <Footer />
    </div>
  );
};

export default ProductPage;
