import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => {
    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <h3 className="text-sm font-medium text-on-surface-variant uppercase">{title}</h3>
            <p className="mt-1 text-3xl font-semibold text-on-surface">{value}</p>
        </div>
    );
};

export default StatCard;
