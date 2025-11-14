import React from 'react';
import { Section } from '../../types';

interface PropertyPanelProps {
  selectedSection: Section | null;
  onUpdateSection: (sectionId: string, newProps: any) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedSection, onUpdateSection }) => {
  if (!selectedSection) {
    return (
      <div className="p-4 bg-surface-light h-full flex items-center justify-center">
        <p className="text-on-surface-variant">Select a section to edit its properties.</p>
      </div>
    );
  }

  const handlePropChange = (propName: string, value: any) => {
    onUpdateSection(selectedSection.id, {
      ...selectedSection.props,
      [propName]: value,
    });
  };

  return (
    <div className="p-4 bg-surface-light h-full overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 capitalize">{selectedSection.type.replace('-', ' ')} Properties</h3>
      <div className="space-y-4">
        {Object.entries(selectedSection.props).map(([key, value]) => (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium capitalize">{key}</label>
            {typeof value === 'string' && value.length > 100 ? (
                 <textarea
                    id={key}
                    rows={4}
                    value={value}
                    onChange={(e) => handlePropChange(key, e.target.value)}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                 />
            ) : (
                <input
                    type="text"
                    id={key}
                    value={String(value)}
                    onChange={(e) => handlePropChange(key, e.target.value)}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyPanel;
