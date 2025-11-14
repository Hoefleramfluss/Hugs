import React, { useState, useEffect } from 'react';
import api from '../frontend/services/api';
import { Product } from '../frontend/types';
import Header from '../frontend/components/Header';
import Footer from '../frontend/components/Footer';
import PDWHero from '../frontend/components/PDWHero';
import ProductCard from '../frontend/components/ProductCard';

// This component re-implements the logic from `frontend/pages/index.tsx`
// using client-side data fetching (`useEffect`) instead of Next.js `getStaticProps`.
const StorefrontView: React.FC = () => {
    const [productOfWeek, setProductOfWeek] = useState<Product | null>(null);
    const [otherProducts, setOtherProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const allProducts = await api.getProducts();
                const pdw = allProducts.find(p => p.productOfWeek) || null;
                setProductOfWeek(pdw);
                setOtherProducts(allProducts.filter(p => p.id !== pdw?.id));
                setError(null);
            } catch (err) {
                console.error("Failed to fetch products:", err);
                setError("Could not load products. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading Store...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    return (
        <div className="bg-background">
            <Header />
            <main>
                {productOfWeek && <PDWHero product={productOfWeek} />}
                
                <div className="py-16">
                  <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                      {productOfWeek ? 'More Products' : 'Our Products'}
                    </h2>
                    {otherProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                          {otherProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                    ) : (
                        <p className="text-center text-on-surface-variant">No products to display right now. Check back soon!</p>
                    )}
                  </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default StorefrontView;
