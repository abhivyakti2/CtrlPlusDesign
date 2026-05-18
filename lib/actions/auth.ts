"use server";

import { prisma } from "@/lib/prisma";
import type { ExperienceLevel } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

interface AuthenticatedUser {
  id: string;
  email: string;
  experienceLevel: ExperienceLevel;
}

interface LoginResult {
  token: string;
  user: AuthenticatedUser;
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    // Validate input
    if (!email || !password) {
      throw new Error("Email and password required");
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Compare password
    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        experienceLevel: user.experienceLevel,
      },
    };
  } catch (error) {
    // Handle Prisma connection errors
    if (error instanceof Error) {
      if (error.message.includes("Prisma") || error.message.includes("database")) {
        throw new Error("Service unavailable. Please try again later.");
      }
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}

export async function signupUser(
  email: string,
  password: string,
  experienceLevel: ExperienceLevel
): Promise<LoginResult> {
  try {
    // Validate input
    if (!email || !password || !experienceLevel) {
      throw new Error("Missing required fields");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Email already in use");
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        experienceLevel,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        experienceLevel: user.experienceLevel,
      },
    };
  } catch (error) {
    // Handle Prisma connection errors
    if (error instanceof Error) {
      if (error.message.includes("Prisma") || error.message.includes("database")) {
        throw new Error("Service unavailable. Please try again later.");
      }
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}

export async function verifyToken(token: string): Promise<AuthenticatedUser> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        experienceLevel: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return true; // Pretend it succeeded to prevent email discovery

    // In a real app, delete old tokens
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: { email, token, expires }
    });

    // Here we would normally email the user
    console.log(`Reset link: http://localhost:3000/reset-password?token=${token}`);
    return true;
  } catch (err) {
    return false;
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    const resetRecord = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetRecord || resetRecord.expires < new Date()) {
      throw new Error("Invalid or expired token");
    }

    const hashedPassword = await hash(newPassword, 10);
    await prisma.user.update({
      where: { email: resetRecord.email },
      data: { password: hashedPassword }
    });

    await prisma.passwordResetToken.deleteMany({ where: { email: resetRecord.email } });
    return true;
  } catch (err) {
    return false;
  }
}

export async function updateProfile(userId: string, data: { experienceLevel: ExperienceLevel, bio?: string }): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { experienceLevel: data.experienceLevel, bio: data.bio }
    });
    return true;
  } catch (err) {
    return false;
  }
}
