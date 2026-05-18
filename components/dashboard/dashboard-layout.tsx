// src/components/dashboard/dashboard-layout.tsx

"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { ProtectedRoute } from "@/components/protected-route";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-950">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
};
