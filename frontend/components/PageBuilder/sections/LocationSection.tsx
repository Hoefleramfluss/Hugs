import React from 'react';

interface LocationSectionProps {
  title: string;
  address: string;
  googleMapsUrl: string;
}

const LocationSection: React.FC<LocationSectionProps> = ({
  title = "Our Location",
  address = "123 Grow Street, Plant Town, 45678",
  googleMapsUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.521260322283!2d106.81956135078502!3d-6.19474139551469!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f5390917b759%3A0x6b45e67356080477!2sNational%20Monument!5e0!3m2!1sen!2sid!4v1621480195535!5m2!1sen!2sid",
}) => {
  return (
    <div className="bg-surface-light py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-lg text-on-surface-variant mb-8">{address}</p>
        <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden shadow-lg">
          <iframe
            src={googleMapsUrl}
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            title="Google Map Location"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default LocationSection;
