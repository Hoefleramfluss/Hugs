import React from 'react';

interface BannerSectionProps {
  title: string;
  buttonText: string;
  buttonLink: string;
}

const BannerSection: React.FC<BannerSectionProps> = ({
  title = "Summer Sale On Now!",
  buttonText = "Shop Deals",
  buttonLink = "/sales"
}) => {
  return (
    <div className="bg-primary text-white">
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <h3 className="text-2xl font-bold mb-4 md:mb-0">{title}</h3>
        <a href={buttonLink} className="inline-block bg-surface hover:bg-surface-light text-primary font-bold py-2 px-6 rounded-full transition-colors">
          {buttonText}
        </a>
      </div>
    </div>
  );
};

export default BannerSection;
