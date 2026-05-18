// src/app/(dashboard)/settings/page.tsx

"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  Bell,
  Lock,
  User,
  Palette,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">
            Manage your account preferences and application settings.
          </p>
        </div>

        {/* Profile Settings */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <User size={24} className="text-[#5b7fff]" />
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Email
                </p>
                <p className="text-white font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Experience Level
                </p>
                <p className="text-white font-medium capitalize">
                  {user?.experienceLevel.toLowerCase()}
                </p>
              </div>
              <Button variant="secondary">Edit Profile</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell size={24} className="text-[#3ecf8e]" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control your notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNotificationsEnabled}
                  onChange={(e) => setIsNotificationsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-[#5b7fff]"
                />
                <div>
                  <p className="text-white font-medium">Enable Notifications</p>
                  <p className="text-sm text-gray-400">
                    Get notifications about new problems and achievements
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-[#5b7fff]"
                />
                <div>
                  <p className="text-white font-medium">Email Digests</p>
                  <p className="text-sm text-gray-400">
                    Weekly summary of your progress
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette size={24} className="text-[#a78bfa]" />
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={(e) => setIsDarkMode(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-[#5b7fff]"
              />
              <div>
                <p className="text-white font-medium">Dark Mode</p>
                <p className="text-sm text-gray-400">
                  Use dark theme for the application
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock size={24} className="text-[#ff5c5c]" />
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button variant="secondary">Change Password</Button>
              <Button variant="secondary">Enable Two-Factor Authentication</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
