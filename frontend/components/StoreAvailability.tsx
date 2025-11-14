import React from 'react';

// This could fetch data from the backend about which locations have stock.
const StoreAvailability: React.FC<{ variantId: string }> = ({ variantId }) => {
    // Mock data for demonstration
    const stockLocations = [
        { name: 'Main Warehouse', inStock: true },
        { name: 'Downtown Store', inStock: false },
    ];
    return (
        <div className="mt-6 p-4 border rounded-md">
            <h3 className="font-semibold mb-2">Store Availability</h3>
            <ul className="space-y-1">
                {stockLocations.map(loc => (
                    <li key={loc.name} className="flex justify-between text-sm">
                        <span>{loc.name}</span>
                        <span className={loc.inStock ? 'text-green-600' : 'text-red-500'}>
                            {loc.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default StoreAvailability;
