// src/app/(dashboard)/progress/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { getProgressData, type ProgressData } from "@/lib/actions/dashboard";
import {
  TrendingUp,
  Award,
  Clock,
  Target,
} from "lucide-react";

function formatExperienceLevel(level?: string) {
  if (!level) return "";
  return level.replace(/_/g, " ");
}

export default function ProgressPage() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  useEffect(() => {
    const fetchProgressData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const data = await getProgressData(token);
      setProgressData(data);
    };

    fetchProgressData();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Your Progress</h1>
          <p className="text-gray-400">
            Track your learning and improvement over time.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatsCard
            icon={<TrendingUp size={24} />}
            label="Total Attempts"
            value={progressData?.totalAttempts ?? 0}
            description="Interview problems attempted"
            color="accent"
          />
          <StatsCard
            icon={<Award size={24} />}
            label="Success Rate"
            value={`${progressData?.successRate ?? 0}%`}
            description="Problems completed successfully"
            color="success"
          />
          <StatsCard
            icon={<Clock size={24} />}
            label="Avg. Time"
            value={`${progressData?.averageTimeMinutes ?? 0} min`}
            description="Average time per problem"
            color="info"
          />
          <StatsCard
            icon={<Target size={24} />}
            label="Level"
            value={formatExperienceLevel(progressData?.experienceLevel)}
            description="Your current experience level"
            color="warning"
          />
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Weekly Activity
            </h3>
            <div className="h-48 flex items-end gap-2">
              {(progressData?.weeklyActivity ?? []).map((item) => (
                <div
                  key={item.label}
                  className="flex-1 bg-gradient-to-t from-[#5b7fff] to-[#7a92ff] rounded-t opacity-80"
                  style={{ height: `${item.value}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-4">
              {(progressData?.weeklyActivity ?? []).map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Problem Difficulty
            </h3>
            <div className="space-y-4">
              {(progressData?.difficultyProgress ?? []).map((item) => (
                <div key={item.difficulty}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      {item.difficulty.toLowerCase()}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {item.completed}/{item.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={
                        item.difficulty === "EASY"
                          ? "bg-[#3ecf8e] h-2 rounded-full"
                          : item.difficulty === "MEDIUM"
                          ? "bg-[#ffa500] h-2 rounded-full"
                          : "bg-[#ff5c5c] h-2 rounded-full"
                      }
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
