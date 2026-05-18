// src/components/dashboard/sidebar.tsx

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { SiteBrand } from "@/components/site-header";
import {
  LayoutDashboard,
  PenTool,
  BookOpen,
  LineChart,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
  },
  {
    href: "/create",
    label: "New Design",
    icon: <PenTool size={20} />,
  },
  {
    href: "/designs",
    label: "My Designs",
    icon: <BookOpen size={20} />,
  },
  {
    href: "/progress",
    label: "Progress",
    icon: <LineChart size={20} />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <Settings size={20} />,
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <SiteBrand />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-[#5b7fff] text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        <div className="px-4 py-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">Logged in as</p>
          <p className="text-white font-medium truncate">
            {user?.email}
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {user?.experienceLevel.toLowerCase()}
          </p>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-900 hover:bg-opacity-10 rounded-lg transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
