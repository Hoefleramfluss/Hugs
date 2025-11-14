// Fix: Use relative path for type imports
import { Product } from '../types';
import ProductCard from './ProductCard';
// FIX: Added import for React to resolve namespace error.
import React from 'react';

interface RecommendedSliderProps {
    products: Product[];
}

const RecommendedSlider: React.FC<RecommendedSliderProps> = ({ products }) => {
    return (
        <div className="container mx-auto px-4 py-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Recommended For You</h2>
            <div className="flex overflow-x-auto space-x-8 pb-4">
                {products.map(product => (
                    <div key={product.id} className="flex-shrink-0 w-80">
                         <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendedSlider;