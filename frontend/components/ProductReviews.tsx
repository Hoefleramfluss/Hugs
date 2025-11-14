import React from 'react';

const mockReviews = [
    { id: 1, user: 'Alice', rating: 5, comment: 'Great product, exceeded my expectations!' },
    { id: 2, user: 'Bob', rating: 4, comment: 'Very good, but shipping was a bit slow.' },
];

const ProductReviews: React.FC<{ productId: string }> = ({ productId }) => {
    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
            <div className="space-y-6">
                {mockReviews.map(review => (
                    <div key={review.id} className="p-4 border rounded-md">
                        <div className="flex items-center mb-2">
                            <span className="font-semibold">{review.user}</span>
                            <span className="ml-auto text-yellow-500">{'★'.repeat(review.rating)}</span>
                        </div>
                        <p className="text-on-surface-variant">{review.comment}</p>
                    </div>
                ))}
            </div>
            {/* Add a form to submit a new review */}
        </div>
    );
};

export default ProductReviews;
