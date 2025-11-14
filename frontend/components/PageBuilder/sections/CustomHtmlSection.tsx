import React from 'react';

interface CustomHtmlSectionProps {
  html: string;
}

const CustomHtmlSection: React.FC<CustomHtmlSectionProps> = ({ html }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div dangerouslySetInnerHTML={{ __html: html || '<p><em>Enter custom HTML content in the property panel.</em></p>' }} />
    </div>
  );
};

export default CustomHtmlSection;
