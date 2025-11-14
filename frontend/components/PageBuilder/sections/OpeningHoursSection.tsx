import React from 'react';

interface OpeningHoursSectionProps {
  title: string;
  hours: { day: string, time: string }[];
}

const defaultHours = [
    { day: "Monday - Friday", time: "09:00 - 18:00" },
    { day: "Saturday", time: "10:00 - 16:00" },
    { day: "Sunday", time: "Closed" },
];

const OpeningHoursSection: React.FC<OpeningHoursSectionProps> = ({
  title = "Opening Hours",
  hours = defaultHours,
}) => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-surface p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-bold mb-6 text-primary">{title}</h2>
        <div className="space-y-3">
          {hours.map((item, index) => (
            <div key={index} className="flex justify-between border-b border-surface-light pb-2">
              <span className="font-semibold">{item.day}</span>
              <span className="text-on-surface-variant">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OpeningHoursSection;
