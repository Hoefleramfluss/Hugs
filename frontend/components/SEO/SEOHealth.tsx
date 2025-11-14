import React from 'react';

const SEOHealth: React.FC = () => {
    // This would be calculated based on various factors in a real app
    const healthScore = 85;
    const recommendations = [
        "Add alt text to 3 product images.",
        "Improve meta description for 'LED Grow Light' product.",
        "Consider adding a blog to increase organic traffic.",
    ];

    const getScoreColor = (score: number) => {
        if (score > 80) return 'text-green-500';
        if (score > 50) return 'text-yellow-500';
        return 'text-red-500';
    }

    return (
        <div>
            <div className="text-center mb-4">
                <p className="text-lg font-semibold">Overall SEO Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(healthScore)}`}>{healthScore}%</p>
            </div>
            <div>
                <h3 className="font-semibold mb-2">Recommendations:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    {recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default SEOHealth;
