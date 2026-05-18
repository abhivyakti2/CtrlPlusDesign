// src/components/problems/problem-selector.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, BookMarked } from "lucide-react";
import { getProblems } from "@/lib/actions/problems";

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  company?: string[];
  topics?: string[];
}

interface ProblemSelectorProps {
  onSelectProblem: (problem: Problem) => void;
  onSkip?: () => void;
}

const difficultyColors = {
  EASY: "bg-[#3ecf8e] text-white",
  MEDIUM: "bg-[#ffa500] text-white",
  HARD: "bg-[#ff5c5c] text-white",
  EXPERT: "bg-[#ff5c5c] text-white",
};

export const ProblemSelector: React.FC<ProblemSelectorProps> = ({
  onSkip,
}) => {
  const [error, setError] = useState<string | null>(null);

 

  return (
      
      <div className="flex gap-3 justify-center mb-8">
        <Button
          variant="secondary"
          size="lg"
          onClick={onSkip}
          className="min-w-[200px]"
        >
          <BookMarked size={18} className="mr-2" />
          Create Empty Design
        </Button>
      </div>

  );
};
