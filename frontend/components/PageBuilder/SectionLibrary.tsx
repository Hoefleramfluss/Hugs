import React from 'react';

const sectionTypes = [
  { type: 'hero', name: 'Hero' },
  { type: 'product-grid', name: 'Product Grid' },
  { type: 'testimonial', name: 'Testimonial' },
  { type: 'banner', name: 'Banner' },
  { type: 'text-block', name: 'Text Block' },
  { type: 'location', name: 'Location Map' },
  { type: 'opening-hours', name: 'Opening Hours' },
  { type: 'video-hero', name: 'Video Hero' },
  { type: 'custom-html', name: 'Custom HTML' },
];

interface SectionLibraryProps {
  onAddSection: (type: string) => void;
}

const SectionLibrary: React.FC<SectionLibraryProps> = ({ onAddSection }) => {
  return (
    <div className="p-4 bg-surface-light h-full overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Add Section</h3>
      <div className="grid grid-cols-2 gap-2">
        {sectionTypes.map((section) => (
          <button
            key={section.type}
            onClick={() => onAddSection(section.type)}
            className="p-4 bg-surface rounded shadow text-center hover:bg-primary/10 hover:border-primary border border-transparent transition-all"
          >
            {section.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SectionLibrary;
