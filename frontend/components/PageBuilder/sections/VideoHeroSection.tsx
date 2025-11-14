import React from 'react';

interface VideoHeroSectionProps {
  videoUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
}

const VideoHeroSection: React.FC<VideoHeroSectionProps> = ({
  videoUrl = "https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4",
  title = "Immersive Experiences",
  subtitle = "Engage your audience with stunning video backgrounds.",
  buttonText = "Learn More",
  buttonLink = "#"
}) => {
  return (
    <div className="relative h-screen flex items-center justify-center text-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50 z-10"></div>
      <div className="relative z-20 text-center p-4">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">{title}</h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">{subtitle}</p>
        <a href={buttonLink} className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">
          {buttonText}
        </a>
      </div>
    </div>
  );
};

export default VideoHeroSection;
