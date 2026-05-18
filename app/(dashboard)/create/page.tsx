// src/app/(dashboard)/create/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ProblemSelector } from "@/components/problems/problem-selector";
import { RecommendationEngine } from "@/components/RecommendationEngine";
import { useRouter, useSearchParams } from "next/navigation";
import { createDesign } from "@/lib/actions/designs";

// Helper function to clean up problem titles
function cleanProblemTitle(title: string): string {
  // Remove "Design a " or "Design an " prefix
  return title.replace(/^Design\s+(a|an)\s+/i, "");
}

export default function CreateDesignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);

  // Handle problemId from query params (from RecommendationEngine Practice button)
  useEffect(() => {
    const problemId = searchParams.get("problemId");
    if (problemId) {
      handleProblemFromRecommendation(problemId);
    }
  }, [searchParams]);

  const handleProblemFromRecommendation = async (problemId: string) => {
    setIsCreating(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      // Get problem details from RecommendationEngine's PROBLEMS_DB
      const allProblems = [
        { id: "1", title: "Design a URL Shortener", difficulty: "EASY", category: "Basics" },
        { id: "2", title: "Design an Image Hosting Service", difficulty: "EASY", category: "Storage" },
        { id: "3", title: "Design a Pastebin", difficulty: "EASY", category: "Web App" },
        { id: "4", title: "Design Twitter Newsfeed", difficulty: "MEDIUM", category: "Social" },
        { id: "5", title: "Design a Key-Value Store", difficulty: "MEDIUM", category: "Storage" },
        { id: "6", title: "Design WhatsApp Chat System", difficulty: "MEDIUM", category: "Messaging" },
        { id: "7", title: "Design Uber/Lyft Backend", difficulty: "HARD", category: "Location" },
        { id: "8", title: "Design Netflix Video Streaming", difficulty: "HARD", category: "Streaming" },
        { id: "9", title: "Design Distributed Rate Limiter", difficulty: "HARD", category: "Infrastructure" },
        { id: "10", title: "Design a Distributed Message Queue", difficulty: "EXPERT", category: "Infrastructure" },
        { id: "11", title: "Design Google Search Engine", difficulty: "EXPERT", category: "Search" },
        { id: "12", title: "Design a Global CDN", difficulty: "EXPERT", category: "Networking" },
        { id: "13", title: "Design a Cloud Provider Control Plane", difficulty: "EXPERT", category: "Cloud" },
      ];

      const problem = allProblems.find(p => p.id === problemId);
      if (!problem) throw new Error("Problem not found");

      const cleanedTitle = cleanProblemTitle(problem.title);
      
      const design = await createDesign(token, {
        title: cleanedTitle,
        difficulty: problem.difficulty as "EASY" | "MEDIUM" | "HARD" | "EXPERT",
      });
      
      router.push(`/editor-new?designId=${design.id}`);
    } catch (error) {
      console.error("Failed to create design from recommendation:", error);
      window.alert("Failed to create design");
      setIsCreating(false);
    }
  };

  const handleSelectProblem = async (problem: any) => {
    setIsCreating(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      const cleanedTitle = cleanProblemTitle(problem.title);
      
      const design = await createDesign(token, {
        title: cleanedTitle,
        problemStatement: problem.description,
        difficulty: problem.difficulty,
        tags: problem.topics || [],
      });
      
      // Redirect to editor with design ID
      router.push(`/editor-new?designId=${design.id}`);
    } catch {
      window.alert("Failed to create design");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = async () => {
    setIsCreating(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      const design = await createDesign(token, {
        title: `Untitled-${Date.now()}`,
      });
      
      router.push(`/editor-new?designId=${design.id}`);
    } catch {
      window.alert("Failed to create design");
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-gray-400">Creating new design...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Create New Design</h1>
            <p className="text-gray-400">Start with a recommendation or pick your own problem</p>
          </div>
          {/* Problem Selector Section */}
          <div>
            <ProblemSelector
              onSelectProblem={handleSelectProblem}
              onSkip={handleSkip}
            />
          </div>

          {/* Recommendation Section */}
          <div className="mb-12">
            <RecommendationEngine />
          </div>

          
        </div>
      </div>
    </DashboardLayout>
  );
}
