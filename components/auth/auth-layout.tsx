// src/components/auth/auth-layout.tsx

import React from "react";
import { SiteHeader } from "@/components/site-header";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary flex flex-col">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple/5 rounded-full blur-3xl -z-10" />

      <SiteHeader />

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        {/* Logo / Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-text-primary font-serif mb-2">
            Ctrl+Design
          </h1>
          <p className="text-text-secondary">
            AI-Powered System Design Interview Practice
          </p>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-md">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-text-muted">
          <p>© 2026 Ctrl+Design. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
