"use server";

import { prisma } from "@/lib/prisma";
import type { Difficulty, ExperienceLevel } from "@prisma/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  company?: string[];
  topics?: string[];
  minLevel?: string;
  averageScore?: number | null;
  attemptCount?: number;
}

function decodeUserId(token: string | null): string | null {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

function getPreferredDifficulties(level?: ExperienceLevel): Difficulty[] {
  switch (level) {
    case "FRESHER":
      return ["EASY", "MEDIUM"];
    case "SDE1":
      return ["MEDIUM", "EASY"];
    case "SDE2":
      return ["MEDIUM", "HARD"];
    case "SENIOR_ENGINEER":
    case "STAFF_ENGINEER":
      return ["HARD", "EXPERT"];
    case "ARCHITECT":
      return ["EXPERT", "HARD"];
    default:
      return ["MEDIUM", "EASY", "HARD", "EXPERT"];
  }
}

export async function getProblems(token: string | null = null): Promise<{ problems: Problem[] }> {
  const userId = decodeUserId(token);
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { experienceLevel: true },
      })
    : null;
  const preferredDifficulties = getPreferredDifficulties(user?.experienceLevel);

  const problems = await prisma.systemDesignProblem.findMany({
    orderBy: [{ attemptCount: "desc" }, { averageScore: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      companies: true,
      tags: true,
      averageScore: true,
      attemptCount: true,
    },
  });

  const sortedProblems = problems.sort((a, b) => {
    const aRank = preferredDifficulties.indexOf(a.difficulty);
    const bRank = preferredDifficulties.indexOf(b.difficulty);
    const normalizedARank = aRank === -1 ? preferredDifficulties.length : aRank;
    const normalizedBRank = bRank === -1 ? preferredDifficulties.length : bRank;

    if (normalizedARank !== normalizedBRank) {
      return normalizedARank - normalizedBRank;
    }

    if (a.attemptCount !== b.attemptCount) {
      return b.attemptCount - a.attemptCount;
    }

    return (b.averageScore ?? 0) - (a.averageScore ?? 0);
  });

  return {
    problems: sortedProblems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      company: problem.companies,
      topics: problem.tags,
      averageScore: problem.averageScore,
      attemptCount: problem.attemptCount,
    })),
  };
}

export async function getProblemById(id: string): Promise<Problem | null> {
  const problem = await prisma.systemDesignProblem.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      companies: true,
      tags: true,
    },
  });

  if (!problem) {
    return null;
  }

  return {
    id: problem.id,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    company: problem.companies,
    topics: problem.tags,
  };
}
