import React from 'react';
import { Section } from '../../types';

interface SectionListProps {
  sections: Section[];
  selectedSectionId?: string | null;
  onSelectSection: (sectionId: string) => void;
  onMoveSection: (fromIndex: number, toIndex: number) => void;
}

const SectionList: React.FC<SectionListProps> = ({
  sections,
  selectedSectionId,
  onSelectSection,
  onMoveSection,
}) => {
  return (
    <div className="p-2 space-y-2">
      {sections.map((section, index) => (
        <div
          key={section.id}
          onClick={() => onSelectSection(section.id)}
          className={`p-3 rounded-md cursor-pointer border ${
            selectedSectionId === section.id
              ? 'bg-blue-100 border-blue-500'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold capitalize">{section.type.replace('-', ' ')}</span>
            <div className="space-x-1">
              <button
                disabled={index === 0}
                onClick={(e) => { e.stopPropagation(); onMoveSection(index, index - 1); }}
                className="px-2 py-1 text-xs rounded bg-gray-200 disabled:opacity-50"
              >
                ▲
              </button>
              <button
                disabled={index === sections.length - 1}
                onClick={(e) => { e.stopPropagation(); onMoveSection(index, index + 1); }}
                className="px-2 py-1 text-xs rounded bg-gray-200 disabled:opacity-50"
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SectionList;
