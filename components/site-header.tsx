import React from "react";
import Link from "next/link";

interface SiteBrandProps {
  className?: string;
  showName?: boolean;
}

interface SiteHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export const SiteBrand: React.FC<SiteBrandProps> = ({
  className = "",
  showName = true,
}) => {
  return (
    <Link href="/dashboard" className={`flex items-center gap-2 ${className}`}>
      <div className="w-10 h-10 bg-gradient-to-br from-[#5b7fff] to-[#a78bfa] rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">A</span>
      </div>
      {showName && (
        <span className="text-xl font-bold text-white">ArchitectIQ</span>
      )}
    </Link>
  );
};

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  children,
  className = "",
}) => {
  return (
    <header className={`h-16 bg-gray-900 border-b border-gray-800 px-6 flex items-center justify-between gap-4 ${className}`}>
      <SiteBrand />
      {children && (
        <div className="flex flex-1 items-center justify-between gap-3">
          {children}
        </div>
      )}
    </header>
  );
};
