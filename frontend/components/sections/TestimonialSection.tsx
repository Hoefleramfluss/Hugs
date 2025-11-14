import React from 'react';

interface TestimonialSectionProps {
  quote: string;
  author: string;
  role: string;
}

const TestimonialSection: React.FC<TestimonialSectionProps> = ({
  quote = "This shop has the best products and the most helpful staff. I wouldn't go anywhere else!",
  author = "Alex Green",
  role = "Happy Customer"
}) => {
  return (
    <div className="bg-surface-light py-16">
      <div className="container mx-auto px-4 text-center">
        <blockquote className="max-w-3xl mx-auto">
          <p className="text-2xl md:text-3xl font-medium italic text-on-surface mb-6">
            “{quote}”
          </p>
          <footer className="font-semibold text-primary">{author}</footer>
          <p className="text-on-surface-variant">{role}</p>
        </blockquote>
      </div>
    </div>
  );
};

export default TestimonialSection;
