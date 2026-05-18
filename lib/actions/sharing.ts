"use server";

import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

interface ShareDesignInput {
  designId: string;
  expiresIn?: number;
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

export async function shareDesign(
  token: string,
  input: ShareDesignInput
) {
  const decoded = verifyAndDecodeToken(token);

  // Verify ownership
  const design = await prisma.canvas.findFirst({
    where: {
      id: input.designId,
      userId: decoded.userId,
    },
  });

  if (!design) {
    throw new Error("Design not found or not authorized");
  }

  // Update visibility to PUBLIC
  await prisma.canvas.update({
    where: { id: input.designId },
    data: { visibility: "PUBLIC" },
  });

  // Generate simpler share token (can use design ID with expiration)
  const shareToken = crypto.randomBytes(16).toString("hex");
  const expiryDate = input.expiresIn
    ? new Date(Date.now() + input.expiresIn * 1000)
    : null;

  return {
    shareUrl: `/share/${input.designId}?token=${shareToken}`,
    token: shareToken,
    expiresAt: expiryDate,
    designId: input.designId,
  };
}
