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
      <div className="min-w-[2.75rem] h-10 px-1.5 bg-gradient-to-br from-[#5b7fff] to-[#a78bfa] rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-[10px] leading-none tracking-tight">
          Ctrl
        </span>
      </div>
      {showName && (
        <span className="text-xl font-bold text-white">Ctrl+Design</span>
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
