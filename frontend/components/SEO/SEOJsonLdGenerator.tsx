import React, { useState } from 'react';

const initialJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'url': 'http://www.example.com',
    'name': 'GrowShop',
    'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+1-401-555-1212',
        'contactType': 'customer service'
    }
};

const SEOJsonLdGenerator: React.FC = () => {
    const [jsonLd, setJsonLd] = useState(JSON.stringify(initialJsonLd, null, 2));

    return (
        <div>
            <p className="text-sm text-on-surface-variant mb-2">
                This JSON-LD structured data helps search engines understand your organization.
            </p>
            <textarea
                value={jsonLd}
                onChange={(e) => setJsonLd(e.target.value)}
                rows={10}
                className="w-full p-2 font-mono text-sm bg-gray-100 border rounded-md"
            />
        </div>
    );
};

export default SEOJsonLdGenerator;
