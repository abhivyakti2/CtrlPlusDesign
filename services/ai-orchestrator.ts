// src/services/ai-orchestrator.ts

/**
 * AI Orchestration Service
 *
 * This module coordinates AI-powered evaluation of system designs.
 * It combines:
 * - Rule-based deterministic checks
 * - LLM-based reasoning
 * - Vector database retrieval (RAG)
 * - Semantic graph analysis
 */

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
}

interface Finding {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion: string;
  source: "rule" | "llm" | "rag";
}

interface EvaluationResult {
  designId: string;
  findings: Finding[];
  score: number;
  completeness: number;
  scalabilityScore: number;
  securityScore: number;
  recommendations: string[];
  reasoning?: string;
}

/**
 * Analyze design structure and identify common architectural issues
 */
export async function performRuleBasedAnalysis(
  request: EvaluationRequest
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check 1: SPOF (Single Point of Failure) Detection
  const spofs = detectSinglePointsOfFailure(request.content);
  findings.push(
    ...spofs.map((spof) => ({
      type: "spof",
      severity: "warning" as const,
      message: `Component "${spof}" appears to be a single point of failure`,
      suggestion:
        "Add redundancy or failover mechanism for critical components",
      source: "rule" as const,
    }))
  );

  // Check 2: Scalability Issues
  const scalabilityIssues = detectScalabilityIssues(request.content);
  findings.push(
    ...scalabilityIssues.map((issue) => ({
      type: "scalability",
      severity: "warning" as const,
      message: issue.message,
      suggestion: issue.suggestion,
      source: "rule" as const,
    }))
  );

  // Check 3: Security Issues
  const securityIssues = detectSecurityIssues(request.content);
  findings.push(
    ...securityIssues.map((issue) => ({
      type: "security",
      severity: "warning" as const,
      message: issue.message,
      suggestion: issue.suggestion,
      source: "rule" as const,
    }))
  );

  // Check 4: Data Consistency Issues
  const consistencyIssues = detectConsistencyIssues(request.content);
  findings.push(
    ...consistencyIssues.map((issue) => ({
      type: "consistency",
      severity: "info" as const,
      message: issue.message,
      suggestion: issue.suggestion,
      source: "rule" as const,
    }))
  );

  return findings;
}

function detectSinglePointsOfFailure(content: any): string[] {
  const spofs: string[] = [];
  const incomingConnections = new Map<string, number>();

  // Count incoming connections to each shape
  content.arrows?.forEach((arrow: any) => {
    const current = incomingConnections.get(arrow.target) || 0;
    incomingConnections.set(arrow.target, current + 1);
  });

  // Find components with single incoming connection (excluding sources)
  content.shapes?.forEach((shape: any) => {
    const incomingCount = incomingConnections.get(shape.id) || 0;
    const isDataStore = shape.type?.toLowerCase().includes("database") ||
      shape.type?.toLowerCase().includes("cache");

    if (incomingCount === 1 && isDataStore) {
      spofs.push(shape.text || shape.id);
    }
  });

  return spofs;
}

function detectScalabilityIssues(
  content: any
): Array<{ message: string; suggestion: string }> {
  const issues: Array<{ message: string; suggestion: string }> = [];

  // Check for load balancer
  const hasLoadBalancer = content.shapes?.some((s: any) =>
    s.type?.toLowerCase().includes("loadbalancer")
  );

  if (!hasLoadBalancer && (content.shapes?.length || 0) > 2) {
    issues.push({
      message: "No load balancer found for multiple services",
      suggestion:
        "Add a load balancer to distribute traffic across service instances",
    });
  }

  // Check for caching
  const hasCaching = content.shapes?.some((s: any) =>
    s.type?.toLowerCase().includes("cache")
  );

  if (!hasCaching) {
    issues.push({
      message: "No caching layer detected",
      suggestion:
        "Consider implementing Redis or similar for caching frequently accessed data",
    });
  }

  // Check for database scaling
  const databases = content.shapes?.filter((s: any) =>
    s.type?.toLowerCase().includes("database")
  ) || [];

  if (databases.length === 1) {
    issues.push({
      message: "Single database instance may not scale well",
      suggestion:
        "Consider read replicas, sharding, or distributed databases for high throughput",
    });
  }

  return issues;
}

function detectSecurityIssues(
  content: any
): Array<{ message: string; suggestion: string }> {
  const issues: Array<{ message: string; suggestion: string }> = [];

  // Check for authentication service
  const hasAuth = content.shapes?.some((s: any) =>
    s.type?.toLowerCase().includes("auth")
  );

  if (!hasAuth) {
    issues.push({
      message: "No explicit authentication service found",
      suggestion:
        "Add an authentication layer (JWT, OAuth2) to protect user data",
    });
  }

  // Check for encryption mention
  const mentionsEncryption = (content.shapes || []).some((s: any) =>
    s.text?.toLowerCase().includes("encrypt") ||
    s.text?.toLowerCase().includes("tls") ||
    s.text?.toLowerCase().includes("ssl")
  );

  if (!mentionsEncryption) {
    issues.push({
      message: "No mention of encryption for data in transit",
      suggestion: "Use TLS/SSL for all network communication",
    });
  }

  return issues;
}

function detectConsistencyIssues(
  content: any
): Array<{ message: string; suggestion: string }> {
  const issues: Array<{ message: string; suggestion: string }> = [];

  // Check if design mentions consistency model
  const allText = (content.shapes || [])
    .map((s: any) => s.text)
    .join(" ")
    .toLowerCase();

  if (
    !allText.includes("strong") &&
    !allText.includes("eventual") &&
    !allText.includes("causal")
  ) {
    issues.push({
      message: "Consistency model not explicitly defined",
      suggestion:
        "Clarify whether the system uses strong, eventual, or causal consistency",
    });
  }

  return issues;
}

/**
 * Calculate overall design quality score
 */
export function calculateDesignScore(findings: Finding[]): number {
  let score = 100;

  findings.forEach((finding) => {
    if (finding.severity === "error") score -= 20;
    else if (finding.severity === "warning") score -= 10;
    else if (finding.severity === "info") score -= 5;
  });

  return Math.max(0, Math.min(100, score));
}

/**
 * Main evaluation orchestration
 * Future: integrate with LLM and vector DB
 */
export async function orchestrateEvaluation(
  request: EvaluationRequest
): Promise<EvaluationResult> {
  // Step 1: Rule-based analysis (deterministic, fast)
  const ruleFindings = await performRuleBasedAnalysis(request);

  // Step 2: TODO - LLM-based reasoning
  // const llmFindings = await performLLMAnalysis(request);

  // Step 3: TODO - RAG-based retrieval
  // const ragFindings = await performRAGRetrieval(request);

  // Combine findings
  const allFindings = ruleFindings;

  // Calculate scores
  const score = calculateDesignScore(allFindings);
  const completeness = calculateCompleteness(request.content);
  const scalabilityScore = calculateScalabilityScore(allFindings);
  const securityScore = calculateSecurityScore(allFindings);

  // Generate recommendations
  const recommendations = generateContextualRecommendations(
    allFindings,
    request.userLevel || "SDE1"
  );

  return {
    designId: request.designId,
    findings: allFindings,
    score,
    completeness,
    scalabilityScore,
    securityScore,
    recommendations,
  };
}

function calculateCompleteness(content: any): number {
  if (!content.shapes || content.shapes.length === 0) return 0;
  if (!content.arrows || content.arrows.length === 0) return 30;
  return Math.min(100, 50 + content.shapes.length * 5);
}

function calculateScalabilityScore(findings: Finding[]): number {
  let score = 80;
  findings
    .filter((f) => f.type === "scalability")
    .forEach(() => {
      score -= 15;
    });
  return Math.max(0, Math.min(100, score));
}

function calculateSecurityScore(findings: Finding[]): number {
  let score = 80;
  findings
    .filter((f) => f.type === "security")
    .forEach(() => {
      score -= 20;
    });
  return Math.max(0, Math.min(100, score));
}

function generateContextualRecommendations(
  findings: Finding[],
  userLevel: string
): string[] {
  const recommendations: string[] = [];

  // Level-appropriate recommendations
  if (userLevel === "FRESHER") {
    recommendations.push("Start with a simple architecture: client → server → database");
    recommendations.push("Add a load balancer to handle multiple concurrent users");
  } else if (userLevel === "SDE1" || userLevel === "SDE2") {
    recommendations.push("Consider implementing caching strategies (Redis)");
    recommendations.push("Add monitoring/logging for debugging");
  } else if (userLevel === "SENIOR_ENGINEER" || userLevel === "STAFF_ENGINEER") {
    recommendations.push("Evaluate trade-offs between consistency models");
    recommendations.push("Define SLA/SLO requirements and design for them");
  }

  // Add findings-based recommendations
  if (findings.some((f) => f.type === "spof")) {
    recommendations.push("Add redundancy to eliminate single points of failure");
  }

  if (findings.some((f) => f.type === "scalability")) {
    recommendations.push("Design for horizontal scaling from the start");
  }

  if (findings.some((f) => f.type === "security")) {
    recommendations.push("Security should be implemented at every layer");
  }

  return recommendations;
}

/**
 * AI Service Integration Point
 * Future: Connect to Python FastAPI microservice running LLMs
 */
export async function callAIService(_request: EvaluationRequest): Promise<any> {
  // TODO: Call external AI microservice
  // const response = await fetch(
  //   process.env.AI_SERVICE_URL + "/api/evaluate",
  //   {
  //     method: "POST",
  //     body: JSON.stringify(request),
  //   }
  // );
  // return response.json();

  return null;
}
