import React, { useState } from 'react';

const SEOMetaEditor: React.FC = () => {
    const [title, setTitle] = useState('GrowShop - Your Premium Grow Supply Store');
    const [description, setDescription] = useState('Find the best supplies for your indoor and outdoor growing projects at GrowShop.');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        console.log('Saving meta settings:', { title, description });
        // In a real app, this would make an API call
        setTimeout(() => setIsSaving(false), 1000);
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="globalTitle" className="block text-sm font-medium">Global Site Title</label>
                <input
                    type="text"
                    id="globalTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                />
            </div>
            <div>
                <label htmlFor="globalDescription" className="block text-sm font-medium">Global Meta Description</label>
                <textarea
                    id="globalDescription"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                />
            </div>
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark disabled:opacity-50"
            >
                {isSaving ? 'Saving...' : 'Save Meta Settings'}
            </button>
        </div>
    );
};

export default SEOMetaEditor;
