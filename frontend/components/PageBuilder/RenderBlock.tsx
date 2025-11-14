import React from 'react';
import { Section } from '../../types';

// Import all possible section components
import HeroSection from '../sections/HeroSection';
import ProductGridSection from '../sections/ProductGridSection';
import TestimonialSection from '../sections/TestimonialSection';
import BannerSection from '../sections/BannerSection';
// Page builder specific versions
import TextBlockSection from './sections/TextBlockSection';
import LocationSection from './sections/LocationSection';
import OpeningHoursSection from './sections/OpeningHoursSection';
import VideoHeroSection from './sections/VideoHeroSection';
import CustomHtmlSection from './sections/CustomHtmlSection';

// Map section types to components
const componentMap: { [key: string]: React.ComponentType<any> } = {
  'hero': HeroSection,
  'product-grid': ProductGridSection,
  'testimonial': TestimonialSection,
  'banner': BannerSection,
  'text-block': TextBlockSection,
  'location': LocationSection,
  'opening-hours': OpeningHoursSection,
  'video-hero': VideoHeroSection,
  'custom-html': CustomHtmlSection,
  // Add other section types here
};

interface RenderBlockProps {
  section: Section;
}

const RenderBlock: React.FC<RenderBlockProps> = ({ section }) => {
  const Component = componentMap[section.type];

  if (!Component) {
    return (
      <div className="p-4 my-2 bg-red-100 border border-red-400 text-red-700">
        Unknown section type: {section.type}
      </div>
    );
  }

  return <Component {...section.props} />;
};

export default RenderBlock;
