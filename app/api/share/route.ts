// src/app/api/share/route.ts
// API route that uses server actions

import { NextRequest, NextResponse } from "next/server";
import { shareDesign } from "@/lib/actions/sharing";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { designId, expiresIn } = await req.json();

    const result = await shareDesign(token, {
      designId,
      expiresIn,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Share design error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const status = errorMessage.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
