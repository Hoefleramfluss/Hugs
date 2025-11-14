import React from 'react';
import { Section } from '../../types';
import { generateProductDescription } from '../../services/geminiService';

interface PropertyPanelProps {
  selectedSection: Section | null;
  onUpdateSection: (sectionId: string, newProps: any) => void;
  onGenerateAIDescription?: (sectionId: string, propName: string) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedSection,
  onUpdateSection,
}) => {
  if (!selectedSection) {
    return (
      <div className="p-4 h-full flex items-center justify-center text-gray-500">
        <p>Select a section to edit its properties.</p>
      </div>
    );
  }

  const handlePropChange = (propName: string, value: any) => {
    onUpdateSection(selectedSection.id, {
      ...selectedSection.props,
      [propName]: value,
    });
  };
  
  const handleGenerateDescription = async (propName: string) => {
      const { title, keywords } = selectedSection.props;
      if (!title) {
          alert("Please provide a 'title' property for this section to generate a description.");
          return;
      }
      try {
          const newDescription = await generateProductDescription(title, keywords || '');
          handlePropChange(propName, newDescription);
      } catch (error: any) {
          alert(`AI Generation Failed: ${error.message}`);
      }
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 capitalize">
        {selectedSection.type.replace('-', ' ')} Properties
      </h3>
      <div className="space-y-4">
        {Object.entries(selectedSection.props).map(([key, value]) => (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium capitalize mb-1">
              {key}
            </label>
            {typeof value === 'string' && value.length > 80 ? (
              <textarea
                id={key}
                rows={5}
                value={value}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="w-full p-2 border rounded-md shadow-sm"
              />
            ) : (
              <input
                type="text"
                id={key}
                value={String(value)}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="w-full p-2 border rounded-md shadow-sm"
              />
            )}
            {(key === 'description' || key === 'subtitle') && (
                <button onClick={() => handleGenerateDescription(key)} className="text-xs text-blue-500 hover:underline mt-1">
                    ✨ Generate with AI
                </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyPanel;
