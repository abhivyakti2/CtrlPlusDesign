// src/app/(dashboard)/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/lib/actions/auth";
import type { ExperienceLevel } from "@prisma/client";

export default function ProfilePage() {
  const [level, setLevel] = useState<ExperienceLevel>("FRESHER");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    // Load existing user state
    const userJson = localStorage.getItem("user");
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user.id) setUserId(user.id);
      if (user.experienceLevel) setLevel(user.experienceLevel);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const isUpdated = await updateProfile(userId, { experienceLevel: level });
      if (isUpdated) {
        setSuccess(true);
        // update localstorage
        const userJson = localStorage.getItem("user");
        if (userJson) {
          const user = JSON.parse(userJson);
          user.experienceLevel = level;
          localStorage.setItem("user", JSON.stringify(user));
        }
      } else {
        setError("Failed to update profile");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <h1 className="text-4xl font-bold text-white mb-8">Profile Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Experience Level</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}
            {success && (
              <Alert variant="success">
                Profile updated successfully.
              </Alert>
            )}
            
            <div className="space-y-2 relative">
              <select
                className="flex h-10 w-full rounded-md border border-gray-700 bg-[#1e2330] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
                value={level}
                onChange={(e) => setLevel(e.target.value as ExperienceLevel)}
              >
                <option value="FRESHER">Fresher</option>
                <option value="SDE1">SDE1 (1-3 years)</option>
                <option value="SDE2">SDE2 (3-5 years)</option>
                <option value="SENIOR_ENGINEER">Senior Engineer (5-8 years)</option>
                <option value="STAFF_ENGINEER">Staff Engineer (8+ years)</option>
                <option value="ARCHITECT">Architect</option>
              </select>
              <p className="text-xs text-gray-400">
                This helps us recommend appropriate system design questions and adjusts the strictness of the evaluations.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
