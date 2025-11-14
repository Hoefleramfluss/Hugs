import React, { useEffect, useRef, useState } from 'react';

interface ScrollAnimationWrapperProps {
  children: React.ReactNode;
  className?: string;
  animationClass?: string;
}

const ScrollAnimationWrapper: React.FC<ScrollAnimationWrapperProps> = ({ 
  children, 
  className = '', 
  animationClass = 'animate-fade-in-up' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Optional: stop observing after it's visible once
          if(domRef.current) {
             observer.unobserve(domRef.current);
          }
        }
      });
    }, {
      threshold: 0.1 // Trigger when 10% of the element is visible
    });

    const { current } = domRef;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, []);

  return (
    <div 
      ref={domRef}
      className={`${className} transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'} ${isVisible ? animationClass : ''}`}
    >
      {children}
    </div>
  );
};

export default ScrollAnimationWrapper;
