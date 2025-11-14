import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Page, Section } from '../../types';
import SectionList from './SectionList';
import PropertyPanel from './PropertyPanel';
import RenderBlock from '../../frontend/components/PageBuilder/RenderBlock';
import SectionLibrary from '../../frontend/components/PageBuilder/SectionLibrary';
import pageBuilderApi from '../../frontend/services/pageBuilderApi';

const PageBuilder: React.FC<{ pageSlug: string }> = ({ pageSlug }) => {
    const [page, setPage] = useState<Page | null>(null);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        pageBuilderApi.getPageBySlug(pageSlug)
            .then(data => {
                setPage(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load page data", err);
                setLoading(false);
            });
    }, [pageSlug]);
    
    const handleSave = async () => {
        if (page) {
            try {
                await pageBuilderApi.updatePageSections(page.slug, page.sections);
                alert('Page saved successfully!');
            } catch (error) {
                alert('Failed to save page.');
            }
        }
    };

    if (loading) return <div>Loading Page Builder...</div>;
    if (!page) return <div>Could not load page data for '{pageSlug}'.</div>;
    
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <div className="w-1/4 bg-white flex flex-col h-full border-r">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Page Sections</h2>
                </div>
                {/* SectionList would go here */}
                <div className="flex-grow p-4 overflow-y-auto">
                   <p>Section list placeholder</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="p-4 bg-white border-b flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Editing: {page.title}</h1>
                    <button onClick={handleSave} className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600">
                        Save Page
                    </button>
                </div>
                <div className="flex-grow bg-gray-200 p-4 overflow-y-auto">
                    {page.sections.map(section => (
                         <div key={section.id} onClick={() => setSelectedSection(section)} className="cursor-pointer border-2 border-transparent hover:border-blue-500">
                            <RenderBlock section={section} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-1/4 bg-white flex flex-col h-full border-l">
                 <PropertyPanel selectedSection={selectedSection} onUpdateSection={() => {}} />
            </div>
        </div>
    );
};

export default PageBuilder;
