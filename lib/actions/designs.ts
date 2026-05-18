"use server";

import { prisma } from "@/lib/prisma";
import type { Difficulty, Prisma, Visibility } from "@prisma/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

interface CreateDesignInput {
  title: string;
  problemStatement?: string;
  difficulty?: Difficulty;
  tags?: string[];
}

interface UpdateDesignInput {
  title?: string;
  content?: unknown;
  problemStatement?: string;
  difficulty?: Difficulty;
  tags?: string[];
  score?: number;
  visibility?: Visibility;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

// Helper function to extract and verify token
function verifyAndDecodeToken(token: string | null): { userId: string } {
  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    throw new Error("Unauthorized");
  }
}

export async function createDesign(
  token: string,
  input: CreateDesignInput
) {
  const decoded = verifyAndDecodeToken(token);

  const design = await prisma.canvas.create({
    data: {
      title: input.title || `Untitled-${Date.now()}`,
      userId: decoded.userId,
      content: {
        shapes: [],
        arrows: [],
        groups: [],
      },
      problemStatement: input.problemStatement || null,
      difficulty: input.difficulty || "MEDIUM",
      tags: input.tags || [],
      visibility: "PRIVATE",
      score: 0,
    },
  });

  return design;
}

export async function listDesigns(
  token: string,
  params: PaginationParams = {}
) {
  const decoded = verifyAndDecodeToken(token);

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const [designs, total] = await Promise.all([
    prisma.canvas.findMany({
      where: { userId: decoded.userId },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.canvas.count({
      where: { userId: decoded.userId },
    }),
  ]);

  return {
    designs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getDesign(id: string, token: string | null = null) {
  const design = await prisma.canvas.findUnique({
    where: { id },
  });

  if (!design) {
    throw new Error("Design not found");
  }

  // Check permissions
  let userId: string | null = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch {
      // Invalid token, continue as anonymous
    }
  }

  if (design.visibility === "PRIVATE" && design.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return design;
}

export async function updateDesign(
  id: string,
  token: string,
  input: UpdateDesignInput
) {
  const decoded = verifyAndDecodeToken(token);

  const design = await prisma.canvas.findUnique({
    where: { id },
  });

  if (!design) {
    throw new Error("Design not found");
  }

  if (design.userId !== decoded.userId) {
    throw new Error("Unauthorized");
  }

  const updated = await prisma.canvas.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && {
        content: input.content as Prisma.InputJsonValue,
      }),
      ...(input.problemStatement !== undefined && {
        problemStatement: input.problemStatement,
      }),
      ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
    },
  });

  return updated;
}

export async function deleteDesign(id: string, token: string) {
  const decoded = verifyAndDecodeToken(token);

  const design = await prisma.canvas.findUnique({
    where: { id },
  });

  if (!design) {
    throw new Error("Design not found");
  }

  if (design.userId !== decoded.userId) {
    throw new Error("Unauthorized");
  }

  await prisma.canvas.delete({
    where: { id },
  });

  return { success: true };
}
