import React from 'react';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title = "Welcome to Our Shop",
  subtitle = "Find everything you need for your growing journey.",
  buttonText = "Shop Now",
  buttonLink = "/",
  imageUrl = "https://placehold.co/1920x1080?text=Hero+Image"
}) => {
  return (
    <div className="relative bg-black text-white h-[60vh] md:h-[80vh]">
      <div className="absolute inset-0 opacity-50">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="relative container mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>{title}</h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>{subtitle}</p>
        <a href={buttonLink} className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {buttonText}
        </a>
      </div>
    </div>
  );
};

export default HeroSection;
