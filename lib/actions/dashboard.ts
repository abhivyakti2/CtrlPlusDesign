"use server";

import { prisma } from "@/lib/prisma";
import type { Difficulty, ExperienceLevel } from "@prisma/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

interface DecodedToken {
  userId: string;
}

export interface RecentDesign {
  id: string;
  title: string;
  difficulty: Difficulty;
  score: number | null;
  completionStatus: number | null;
  updatedAt: string;
}

export interface DashboardData {
  totalDesigns: number;
  problemsCompleted: number;
  accuracyScore: number;
  streakDays: number;
  recentDesigns: RecentDesign[];
}

export interface WeeklyActivityItem {
  label: string;
  value: number;
  count: number;
}

export interface DifficultyProgressItem {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  completed: number;
  total: number;
  percentage: number;
}

export interface ProgressData {
  totalAttempts: number;
  successRate: number;
  averageTimeMinutes: number;
  experienceLevel: ExperienceLevel;
  weeklyActivity: WeeklyActivityItem[];
  difficultyProgress: DifficultyProgressItem[];
}

function verifyAndDecodeToken(token: string | null): DecodedToken {
  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch {
    throw new Error("Unauthorized");
  }
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function calculateCurrentStreak(activityDates: Set<string>): number {
  let cursor = startOfUtcDay(new Date());
  let streak = 0;

  while (activityDates.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export async function getDashboardData(token: string): Promise<DashboardData> {
  const { userId } = verifyAndDecodeToken(token);

  const sixtyDaysAgo = addDays(startOfUtcDay(new Date()), -60);

  const [
    totalDesigns,
    problemsCompleted,
    scoreAggregate,
    recentDesigns,
    recentCanvasActivity,
    recentAttemptActivity,
  ] = await Promise.all([
    prisma.canvas.count({ where: { userId } }),
    prisma.canvas.count({
      where: {
        userId,
        completionStatus: { gte: 100 },
      },
    }),
    prisma.canvas.aggregate({
      where: {
        userId,
        score: { not: null },
      },
      _avg: { score: true },
    }),
    prisma.canvas.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        difficulty: true,
        score: true,
        completionStatus: true,
        updatedAt: true,
      },
    }),
    prisma.canvas.findMany({
      where: {
        userId,
        updatedAt: { gte: sixtyDaysAgo },
      },
      select: { updatedAt: true },
    }),
    prisma.attempt.findMany({
      where: {
        userId,
        createdAt: { gte: sixtyDaysAgo },
      },
      select: { createdAt: true },
    }),
  ]);

  const activityDates = new Set<string>([
    ...recentCanvasActivity.map((item) => dateKey(item.updatedAt)),
    ...recentAttemptActivity.map((item) => dateKey(item.createdAt)),
  ]);

  return {
    totalDesigns,
    problemsCompleted,
    accuracyScore: Math.round(scoreAggregate._avg.score ?? 0),
    streakDays: calculateCurrentStreak(activityDates),
    recentDesigns: recentDesigns.map((design) => ({
      ...design,
      updatedAt: design.updatedAt.toISOString(),
    })),
  };
}

export async function getProgressData(token: string): Promise<ProgressData> {
  const { userId } = verifyAndDecodeToken(token);

  const today = startOfUtcDay(new Date());
  const weekStart = addDays(today, -6);
  const orderedDifficulties: Array<"EASY" | "MEDIUM" | "HARD"> = ["EASY", "MEDIUM", "HARD"];

  const [
    user,
    totalAttempts,
    successfulAttempts,
    timeAggregate,
    weeklyAttempts,
    userDesignDifficultyCounts,
    problemDifficultyCounts,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { experienceLevel: true },
    }),
    prisma.attempt.count({ where: { userId } }),
    prisma.attempt.count({
      where: {
        userId,
        OR: [{ score: { gte: 70 } }, { completeness: { gte: 100 } }],
      },
    }),
    prisma.attempt.aggregate({
      where: {
        userId,
        completionTime: { not: null },
      },
      _avg: { completionTime: true },
    }),
    prisma.attempt.findMany({
      where: {
        userId,
        createdAt: { gte: weekStart },
      },
      select: { createdAt: true },
    }),
    prisma.canvas.groupBy({
      by: ["difficulty"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.systemDesignProblem.groupBy({
      by: ["difficulty"],
      _count: { _all: true },
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  const weeklyCounts = new Map<string, number>();
  weeklyAttempts.forEach((attempt) => {
    const key = dateKey(attempt.createdAt);
    weeklyCounts.set(key, (weeklyCounts.get(key) ?? 0) + 1);
  });

  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const maxWeeklyCount = Math.max(...weekDays.map((day) => weeklyCounts.get(dateKey(day)) ?? 0), 0);

  const completedByDifficulty = new Map(
    userDesignDifficultyCounts.map((item) => [item.difficulty, item._count._all])
  );
  const totalByDifficulty = new Map(
    problemDifficultyCounts.map((item) => [item.difficulty, item._count._all])
  );

  return {
    totalAttempts,
    successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0,
    averageTimeMinutes: Math.round((timeAggregate._avg.completionTime ?? 0) / 60),
    experienceLevel: user.experienceLevel,
    weeklyActivity: weekDays.map((day) => {
      const count = weeklyCounts.get(dateKey(day)) ?? 0;

      return {
        label: formatWeekday(day),
        count,
        value: maxWeeklyCount > 0 ? Math.max(6, Math.round((count / maxWeeklyCount) * 100)) : 0,
      };
    }),
    difficultyProgress: orderedDifficulties.map((difficulty) => {
      const completed = completedByDifficulty.get(difficulty) ?? 0;
      const storedTotal = totalByDifficulty.get(difficulty) ?? 0;
      const total = Math.max(storedTotal, completed);

      return {
        difficulty,
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }),
  };
}
