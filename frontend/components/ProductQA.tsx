import React from 'react';

const mockQA = [
    { id: 1, question: 'Is this safe for pets?', answer: 'Yes, all our soil products are pet-safe.'},
];

const ProductQA: React.FC<{ productId: string }> = ({ productId }) => {
    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Questions & Answers</h2>
            <div className="space-y-6">
                {mockQA.map(qa => (
                    <div key={qa.id} className="p-4 border rounded-md">
                        <p className="font-semibold">Q: {qa.question}</p>
                        <p className="mt-2 text-on-surface-variant">A: {qa.answer}</p>
                    </div>
                ))}
            </div>
             {/* Add a form to submit a new question */}
        </div>
    );
};

export default ProductQA;
