// src/components/RecommendationEngine.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ExternalLink, Shuffle } from "lucide-react";
import Link from "next/link";
import type { ExperienceLevel } from "@prisma/client";

interface Problem {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  category: string;
}

const PROBLEMS_DB: Record<ExperienceLevel, Problem[]> = {
  FRESHER: [
    { id: "1", title: "Design a URL Shortener", difficulty: "EASY", category: "Basics" },
    { id: "2", title: "Design an Image Hosting Service", difficulty: "EASY", category: "Storage" },
    { id: "3", title: "Design a Pastebin", difficulty: "EASY", category: "Web App" }
  ],
  SDE1: [
    { id: "4", title: "Design Twitter Newsfeed", difficulty: "MEDIUM", category: "Social" },
    { id: "5", title: "Design a Key-Value Store", difficulty: "MEDIUM", category: "Storage" },
    { id: "6", title: "Design WhatsApp Chat System", difficulty: "MEDIUM", category: "Messaging" }
  ],
  SDE2: [
    { id: "7", title: "Design Uber/Lyft Backend", difficulty: "HARD", category: "Location" },
    { id: "8", title: "Design Netflix Video Streaming", difficulty: "HARD", category: "Streaming" },
    { id: "9", title: "Design Distributed Rate Limiter", difficulty: "HARD", category: "Infrastructure" }
  ],
  SENIOR_ENGINEER: [
    { id: "10", title: "Design a Distributed Message Queue", difficulty: "EXPERT", category: "Infrastructure" },
    { id: "11", title: "Design Google Search Engine", difficulty: "EXPERT", category: "Search" }
  ],
  STAFF_ENGINEER: [
    { id: "10", title: "Design a Distributed Message Queue", difficulty: "EXPERT", category: "Infrastructure" },
    { id: "12", title: "Design a Global CDN", difficulty: "EXPERT", category: "Networking" }
  ],
  ARCHITECT: [
    { id: "13", title: "Design a Cloud Provider Control Plane", difficulty: "EXPERT", category: "Cloud" },
    { id: "12", title: "Design a Global CDN", difficulty: "EXPERT", category: "Networking" }
  ]
};

export const RecommendationEngine = () => {
  const [level, setLevel] = useState<ExperienceLevel>("FRESHER");
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    try {
      const userJSON = localStorage.getItem("user");
      if (userJSON) {
        const user = JSON.parse(userJSON);
        if (user.experienceLevel) {
          setLevel(user.experienceLevel);
          setProblems(PROBLEMS_DB[user.experienceLevel as ExperienceLevel] || PROBLEMS_DB.FRESHER);
        } else {
          setProblems(PROBLEMS_DB.FRESHER);
        }
      } else {
        setProblems(PROBLEMS_DB.FRESHER);
      }
    } catch {}
  }, []);

  const handleShuffle = () => {
    const all = Object.values(PROBLEMS_DB).flat();
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    setProblems(shuffled.slice(0, 3));
  };

  return (
    <Card className="bg-[#1e2330] border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Recommended for You</CardTitle>
          <p className="text-sm text-gray-400 mt-1">Based on your {level.replace("_", " ")} level</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleShuffle} className="border-gray-600 text-gray-300">
          <Shuffle size={16} className="mr-2" />
          Shuffle
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {problems.map((p) => (
          <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-accent/50 transition-colors">
            <div>
              <h4 className="font-semibold text-white">{p.title}</h4>
              <div className="flex gap-2 mt-2">
                <span className="text-xs font-medium px-2 py-1 rounded bg-gray-700 text-gray-300">
                  {p.difficulty}
                </span>
                <span className="text-xs font-medium px-2 py-1 rounded bg-[#2a3040] text-accent">
                  {p.category}
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <Button variant="outline" size="sm" className="bg-transparent border-gray-600 text-gray-300">
                <Star size={14} />
              </Button>
              <Link href={`/create?problemId=${p.id}`}>
                <Button variant="primary" size="sm">
                  Practice
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
