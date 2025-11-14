import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDebounce } from '../hooks/useDebounce';
import { Product } from '../types';
import api from '../services/api';

const ProductSearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      setLoading(true);
      // In a real app, this should be a dedicated search endpoint
      // For now, we filter from all products client-side.
      api.getProducts().then(allProducts => {
        const filtered = allProducts.filter(p => 
            p.title.toLowerCase().includes(debouncedQuery.toLowerCase())
        );
        setResults(filtered);
        setLoading(false);
      });
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for products..."
        className="w-full px-4 py-2 border rounded-md"
      />
      {query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10">
          {loading && <div className="p-4 text-gray-500">Searching...</div>}
          {!loading && results.length > 0 && (
            <ul>
              {results.map(product => (
                <li key={product.id}>
                  <Link href={`/product/${product.slug}`} className="block p-4 hover:bg-gray-100" onClick={() => setQuery('')}>
                    {product.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!loading && results.length === 0 && debouncedQuery && (
            <div className="p-4 text-gray-500">No results found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchBar;
