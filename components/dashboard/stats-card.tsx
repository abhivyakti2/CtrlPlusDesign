// src/components/dashboard/stats-card.tsx

import React from "react";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  color?: "accent" | "success" | "warning" | "error" | "info";
}

const colorClasses = {
  accent: "from-[#5b7fff] to-[#4a63d4]",
  success: "from-[#3ecf8e] to-[#2fa474]",
  warning: "from-[#ffa500] to-[#ff8c00]",
  error: "from-[#ff5c5c] to-[#e64545]",
  info: "from-[#a78bfa] to-[#8b5cf6]",
};

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  description,
  color = "accent",
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`bg-gradient-to-br ${colorClasses[color]} p-3 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{label}</h3>
      <p className="text-white text-2xl font-bold">{value}</p>
      {description && (
        <p className="text-gray-500 text-xs mt-2">{description}</p>
      )}
    </div>
  );
};
