import React from 'react';

interface TextBlockSectionProps {
  title: string;
  content: string;
}

const TextBlockSection: React.FC<TextBlockSectionProps> = ({
  title = "About Us",
  content = "This is a paragraph of text. You can edit this in the property panel. It's great for introductions, mission statements, or detailed descriptions.",
}) => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">{title}</h2>
        <p className="text-lg text-on-surface-variant text-center whitespace-pre-line">
            {content}
        </p>
      </div>
    </div>
  );
};

export default TextBlockSection;
