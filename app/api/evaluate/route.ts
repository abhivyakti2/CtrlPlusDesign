// src/app/api/evaluate/route.ts

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { calculateDesignScore, performRuleBasedAnalysis } from "@/services/ai-orchestrator";


const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL; // e.g. http://localhost:8000
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

interface EvaluationRequest {
  designId: string;
  content: {
    shapes: any[];
    arrows: any[];
    groups: any[];
  };
  textContent?: string;
  problemStatement?: string;
  userLevel?: string;
  streaming?: boolean;
}

interface EvaluationResponse {
  designId: string;
  findings: Array<{
    type: string;
    severity: "error" | "warning" | "info";
    message: string;
    suggestion: string;
  }>;
  score: number;
  completeness: number;
  scalabilityScore: number;
  securityScore: number;
  recommendations: string[];
}

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

function ensureUiCompatibility(aiResp: any): EvaluationResponse {
  // FastAPI returns richer schema + ui compatibility subset.
  if (aiResp?.ui && aiResp.ui.findings && aiResp.ui.recommendations) {
    return {
      designId: aiResp.designId,
      findings: aiResp.ui.findings,
      score: aiResp.ui.score,
      completeness: aiResp.ui.completeness ?? 0,
      scalabilityScore: aiResp.ui.scalabilityScore ?? 0,
      securityScore: aiResp.ui.securityScore ?? 0,
      recommendations: aiResp.ui.recommendations,
    };
  }

  // Fallback if service returned simplified fields.
  return aiResp as EvaluationResponse;
}

async function localFallbackEvaluation(body: EvaluationRequest): Promise<EvaluationResponse> {
  const ruleFindings = await performRuleBasedAnalysis(body as any);
  const score = calculateDesignScore(ruleFindings);

  // Keep existing response shape used by the UI.
  const completeness = body.content?.shapes?.length
    ? Math.min(100, 50 + body.content.shapes.length * 5)
    : 0;

  const scalabilityScore = 80;
  const securityScore = 80;

  const recommendations = ruleFindings.map((f: any) => f.suggestion);

  return {
    designId: body.designId,
    findings: ruleFindings,
    score,
    completeness,
    scalabilityScore,
    securityScore,
    recommendations,
  };
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: EvaluationRequest = await req.json();

    const streaming = Boolean(body.streaming);
    const aiUrl = AI_SERVICE_URL;

    const canUseAI = Boolean(aiUrl && AI_SERVICE_API_KEY);

    if (canUseAI) {
      const endpoint = streaming ? `${aiUrl}/evaluate/stream` : `${aiUrl}/evaluate`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVICE_API_KEY!,
        "Authorization": `Bearer ${token}`,
        "X-User-Id": decoded?.userId || "",
      };

      // Only for non-streaming: parse JSON and adapt compatibility.
      if (!streaming) {
        const r = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }).catch(() => null);

        if (r && r.ok) {
          const aiResp = await r.json();
          return NextResponse.json(ensureUiCompatibility(aiResp));
        }
      } else {
        // Streaming: passthrough SSE as-is.
        const r = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }).catch(() => null);

        if (r && r.ok && r.body) {
          const stream = r.body;
          return new NextResponse(stream as any, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }
      }
    }

    // Fallback
    return NextResponse.json(await localFallbackEvaluation(body));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

