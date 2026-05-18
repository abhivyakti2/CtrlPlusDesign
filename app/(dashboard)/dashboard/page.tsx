// src/app/(dashboard)/dashboard/page.tsx

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useDashboardStore } from "@/store/dashboardStore";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDashboardData } from "@/lib/actions/dashboard";
import { RecommendationEngine } from "@/components/RecommendationEngine";
import {
  BarChart3,
  BookOpen,
  Trophy,
  Zap,
  Plus,
  ArrowRight,
  Search,
  Filter
} from "lucide-react";
import Link from "next/link";

function formatStreak(days: number) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { dashboardData, setDashboardData } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setHasAttempted(true);
        return;
      }

      try {
        const data = await getDashboardData(token);
        setDashboardData(data);
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      } finally {
        setHasAttempted(true);
      }
    };

    if (!hasAttempted) {
      fetchDashboardData();
    }
  }, [hasAttempted, setDashboardData]);

  const filteredDesigns = useMemo(() => {
    if (!dashboardData?.recentDesigns) return [];
    if (!searchQuery.trim()) return dashboardData.recentDesigns;
    const lowerQ = searchQuery.toLowerCase();
    return dashboardData.recentDesigns.filter(d => d.title.toLowerCase().includes(lowerQ));
  }, [dashboardData?.recentDesigns, searchQuery]);

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Welcome back! Here&apos;s your progress and latest designs.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/create">
              <Button variant="primary" size="md">
                <Plus size={16} className="mr-2" />
                New Design
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatsCard
            icon={<BookOpen size={24} />}
            label="Total Designs"
            value={dashboardData?.totalDesigns ?? 0}
            description="System design diagrams created"
            color="accent"
          />
          <StatsCard
            icon={<Trophy size={24} />}
            label="Problems Completed"
            value={dashboardData?.problemsCompleted ?? 0}
            description="Interview problems solved"
            color="success"
          />
          <StatsCard
            icon={<BarChart3 size={24} />}
            label="Accuracy Score"
            value={`${dashboardData?.accuracyScore ?? 0}%`}
            description="Average evaluation score"
            color="info"
          />
          <StatsCard
            icon={<Zap size={24} />}
            label="Streak"
            value={formatStreak(dashboardData?.streakDays ?? 0)}
            description="Current practice streak"
            color="warning"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="xl:col-span-2 space-y-8">
            <RecommendationEngine />
          </div>

          {/* Side Column: Recent Designs Tracker */}
          <div className="xl:col-span-1 border-l border-gray-800 pl-0 xl:pl-8 space-y-6 flex flex-col pt-2 xl:pt-0">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Your Workspaces</h2>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <Input 
                  placeholder="Search canvases..." 
                  className="pl-10 bg-gray-800/50 border-gray-700 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 min-h-[300px]">
              {filteredDesigns.length ? (
                <div className="space-y-3">
                  {filteredDesigns.map((design) => (
                    <Link
                      key={design.id}
                      href={`/editor-new?designId=${design.id}`}
                      className="group flex flex-col rounded-lg border border-gray-700 bg-gray-800/40 p-4 hover:border-accent/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-white font-medium group-hover:text-accent transition-colors">{design.title}</h3>
                        <ArrowRight size={16} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex justify-between mt-3 text-xs text-gray-400 border-t border-gray-700 pt-3">
                        <span className="bg-gray-800 px-2 py-0.5 rounded">{design.difficulty}</span>
                        <span>{formatDate(design.updatedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-8 text-center h-full flex flex-col items-center justify-center">
                  <BookOpen size={32} className="text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 mb-4">
                    {searchQuery ? "No designs found matching your search." : "No designs yet."}
                  </p>
                  {!searchQuery && (
                    <Link href="/create">
                      <Button variant="outline" size="sm">Create First Sandbox</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
            {dashboardData?.recentDesigns?.length ? (
              <Link href="/designs">
                <Button variant="ghost" className="w-full text-sm text-gray-400 hover:text-white">View Full History <ArrowRight size={14} className="ml-2"/></Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
