from __future__ import annotations

import os
import time
import uuid
from typing import Any, Dict, List, Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field


# -------------------------
# Config (minimal for MVP)
# -------------------------

AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "dev-service-key-change-me")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key")


# -------------------------
# App
# -------------------------

app = FastAPI(title="Ctrl+Design AI Evaluation Service", version="0.1.0")


# -------------------------
# Schemas (compatible subset)
# -------------------------

FindingSeverity = Literal["error", "warning", "info"]


class IncomingCanvasContent(BaseModel):
    shapes: List[Any] = Field(default_factory=list)
    arrows: List[Any] = Field(default_factory=list)
    groups: List[Any] = Field(default_factory=list)


class EvaluationRequest(BaseModel):
    designId: str
    content: IncomingCanvasContent
    textContent: Optional[str] = None
    problemStatement: Optional[str] = None
    userLevel: Optional[str] = None


class Finding(BaseModel):
    id: str
    type: str
    severity: FindingSeverity
    category: str = "OTHER"
    title: str
    message: str
    description: str = ""
    suggestion: str
    affectedShapeIds: List[str] = Field(default_factory=list)
    source: Literal["rule", "llm", "rag", "hybrid"] = "rule"
    references: List[Dict[str, Any]] = Field(default_factory=list)


class Recommendation(BaseModel):
    id: str
    priority: Literal["high", "medium", "low"]
    category: str = ""
    title: str
    description: str
    relatedComponents: List[str] = Field(default_factory=list)
    references: List[Dict[str, Any]] = Field(default_factory=list)


class EvaluationResponse(BaseModel):
    designId: str
    summary: str = ""
    score: int
    architectureScore: int
    completeness: int
    scalabilityScore: int
    reliabilityScore: int
    securityScore: int
    observabilityScore: int
    dataModelScore: int
    findings: List[Finding]
    recommendations: List[Recommendation]
    missingComponents: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    tradeoffsToDiscuss: List[str] = Field(default_factory=list)
    interviewFollowUps: List[str] = Field(default_factory=list)
    rag: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # UI compatibility subset
    ui: Dict[str, Any] = Field(default_factory=dict)


# -------------------------
# Auth helpers
# -------------------------


def require_api_key(x_api_key: str = Header(default="")) -> None:
    if not x_api_key or x_api_key != AI_SERVICE_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")


def extract_user_id(authorization: Optional[str]) -> Optional[str]:
    # JWT validation is intentionally minimal for MVP.
    # Next.js already verifies JWT; here we only keep X-User-Id optional.
    if not authorization:
        return None
    if authorization.lower().startswith("bearer "):
        return None
    return None


# -------------------------
# Deterministic fallback evaluator
# -------------------------


def analyze_graph(content: IncomingCanvasContent, problem: str | None) -> List[Finding]:
    shapes = content.shapes or []
    arrows = content.arrows or []

    findings: List[Finding] = []

    if not shapes:
        findings.append(
            Finding(
                id=str(uuid.uuid4()),
                type="missing_components",
                severity="error",
                category="ARCHITECTURE",
                title="No components found",
                message="No system components were provided in the diagram.",
                suggestion="Add at least one service/component to your design.",
                affectedShapeIds=[],
                source="rule",
            )
        )
        return findings

    if len(shapes) > 1 and not arrows:
        findings.append(
            Finding(
                id=str(uuid.uuid4()),
                type="missing_connections",
                severity="warning",
                category="ARCHITECTURE",
                title="Missing connections",
                message="Multiple components exist but there are no arrows connecting them.",
                suggestion="Add arrows to show how components communicate.",
                affectedShapeIds=[],
                source="rule",
            )
        )

    # Simple SPOF-like heuristic: count incoming edges per shapeId
    incoming: Dict[str, int] = {}
    for a in arrows:
        to_id = a.get("toShapeId") or a.get("target")
        if not to_id:
            continue
        incoming[to_id] = incoming.get(to_id, 0) + 1

    for s in shapes:
        sid = s.get("id")
        if not sid:
            continue
        stype = str(s.get("type") or "").lower()
        is_data_store = "database" in stype or "cache" in stype
        if incoming.get(sid, 0) == 1 and is_data_store:
            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    type="spof",
                    severity="warning",
                    category="DATABASE",
                    title="Potential single point of failure",
                    message=f"A datastore component (id={sid}) has only one incoming dependency.",
                    suggestion="Add redundancy/failover and clarify replication strategy.",
                    affectedShapeIds=[sid],
                    source="rule",
                )
            )

    if problem:
        # very light heuristic to ensure problem is used
        if "twitter" in problem.lower() and not any(
            "cache" in str(s.get("type") or "").lower() for s in shapes
        ):
            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    type="missing_caching_context",
                    severity="info",
                    category="CACHING",
                    title="Consider timeline caching",
                    message="For social feeds, timeline generation and caching are common performance concerns.",
                    suggestion="Add a caching strategy for hot timelines and describe invalidation/TTL.",
                    affectedShapeIds=[],
                    source="rule",
                )
            )

    return findings


def score_from_findings(findings: List[Finding]) -> Dict[str, int]:
    base = 100
    for f in findings:
        if f.severity == "error":
            base -= 20
        elif f.severity == "warning":
            base -= 10
        else:
            base -= 5

    overall = max(0, min(100, base))

    # Simple breakdowns (deterministic)
    completeness = max(0, min(100, 50 + (5 if len(findings) == 0 else 0)))
    architectureScore = overall
    scalabilityScore = max(0, min(100, 80 - 15 * sum(1 for f in findings if f.type == "missing_connections")))
    reliabilityScore = max(0, min(100, 75 - 10 * sum(1 for f in findings if f.type == "spof")))
    securityScore = max(0, min(100, 80))
    observabilityScore = 70
    dataModelScore = 70

    return {
        "score": overall,
        "architectureScore": architectureScore,
        "completeness": completeness,
        "scalabilityScore": scalabilityScore,
        "reliabilityScore": reliabilityScore,
        "securityScore": securityScore,
        "observabilityScore": observabilityScore,
        "dataModelScore": dataModelScore,
    }


def to_ui_compat(response: EvaluationResponse) -> Dict[str, Any]:
    return {
        "score": response.score,
        "completeness": response.completeness,
        "scalabilityScore": response.scalabilityScore,
        "securityScore": response.securityScore,
        "findings": [
            {
                "type": f.type,
                "severity": f.severity,
                "message": f.message,
                "suggestion": f.suggestion,
            }
            for f in response.findings
        ],
        "recommendations": [r.description for r in response.recommendations],
    }


# -------------------------
# Endpoints
# -------------------------


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "ctrl-design-ai-service",
        "version": app.version,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/ready")
def ready() -> Dict[str, Any]:
    # MVP readiness: Claude & Qdrant are optional.
    # We declare ready if the service can at least return deterministic answers.
    return {
        "ready": True,
        "claudeConfigured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "qdrantConfigured": bool(os.getenv("QDRANT_URL")),
        "booksIndexed": False,
    }


@app.post("/evaluate", response_model=EvaluationResponse)
def evaluate(req: EvaluationRequest, api_key_ok: None = Depends(require_api_key)) -> EvaluationResponse:
    start = time.time()
    user_level = req.userLevel or "SDE1"
    findings = analyze_graph(req.content, req.problemStatement)
    scores = score_from_findings(findings)

    recommendations: List[Recommendation] = []
    if not findings:
        recommendations.append(
            Recommendation(
                id=str(uuid.uuid4()),
                priority="low",
                category="ARCHITECTURE",
                title="Consider deeper trade-offs",
                description="Go beyond components: explain trade-offs, consistency, failure modes, and scaling assumptions.",
                relatedComponents=[],
            )
        )
    else:
        for f in findings[:6]:
            recommendations.append(
                Recommendation(
                    id=str(uuid.uuid4()),
                    priority="medium" if f.severity == "warning" else "high",
                    category=f.category,
                    title=f.title,
                    description=f.suggestion,
                    relatedComponents=[],
                )
            )

    resp = EvaluationResponse(
        designId=req.designId,
        summary="Deterministic graph analysis evaluation (MVP).",
        score=scores["score"],
        architectureScore=scores["architectureScore"],
        completeness=scores["completeness"],
        scalabilityScore=scores["scalabilityScore"],
        reliabilityScore=scores["reliabilityScore"],
        securityScore=scores["securityScore"],
        observabilityScore=scores["observabilityScore"],
        dataModelScore=scores["dataModelScore"],
        findings=findings,
        recommendations=recommendations,
        missingComponents=[],
        strengths=[],
        tradeoffsToDiscuss=[],
        interviewFollowUps=[f"Level target: {user_level}. Explain key trade-offs in your design."],
        rag={"enabled": False, "booksUsed": [], "chunksUsed": 0, "references": []},
        metadata={
            "model": "rule-based-mvp",
            "latencyMs": int((time.time() - start) * 1000),
            "requestId": str(uuid.uuid4()),
            "evaluatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )

    resp.ui = to_ui_compat(resp)
    return resp


@app.post("/evaluate/stream")
def evaluate_stream(
    req: EvaluationRequest,
    request: Request,
    api_key_ok: None = Depends(require_api_key),
) -> StreamingResponse:
    # SSE
    async def gen():
        yield "event: analysis_started\n"
        yield f"data: {{'designId': req.designId}}\n\n"

        findings = analyze_graph(req.content, req.problemStatement)
        for f in findings:
            yield "event: finding\n"
            yield f"data: {f.model_dump()}\n\n"

        scores = score_from_findings(findings)
        yield "event: score\n"
        yield f"data: {scores}\n\n"

        resp = await _build_response(req, findings, scores)
        yield "event: summary\n"
        yield f"data: {resp.summary}\n\n"

        yield "event: complete\n"
        yield f"data: {resp.model_dump_json()}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


async def _build_response(req: EvaluationRequest, findings: List[Finding], scores: Dict[str, int]) -> EvaluationResponse:
    recommendations: List[Recommendation] = []
    for f in findings[:6]:
        recommendations.append(
            Recommendation(
                id=str(uuid.uuid4()),
                priority="medium" if f.severity == "warning" else "high",
                category=f.category,
                title=f.title,
                description=f.suggestion,
            )
        )

    resp = EvaluationResponse(
        designId=req.designId,
        summary="Deterministic graph analysis evaluation (MVP).",
        score=scores["score"],
        architectureScore=scores["architectureScore"],
        completeness=scores["completeness"],
        scalabilityScore=scores["scalabilityScore"],
        reliabilityScore=scores["reliabilityScore"],
        securityScore=scores["securityScore"],
        observabilityScore=scores["observabilityScore"],
        dataModelScore=scores["dataModelScore"],
        findings=findings,
        recommendations=recommendations,
        missingComponents=[],
        strengths=[],
        tradeoffsToDiscuss=[],
        interviewFollowUps=[],
        rag={"enabled": False, "booksUsed": [], "chunksUsed": 0, "references": []},
        metadata={
            "model": "rule-based-mvp",
            "latencyMs": 0,
            "requestId": str(uuid.uuid4()),
            "evaluatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )
    resp.ui = to_ui_compat(resp)
    return resp


# Placeholder endpoints to match spec; implemented later


@app.post("/rag/query")
def rag_query(payload: Dict[str, Any], api_key_ok: None = Depends(require_api_key)) -> Dict[str, Any]:
    return {"enabled": False, "error": "RAG not implemented in MVP yet."}


@app.post("/books/ingest")
def books_ingest(payload: Dict[str, Any], api_key_ok: None = Depends(require_api_key)) -> Dict[str, Any]:
    # MVP: no-op
    return {"ok": True, "message": "Book ingestion not implemented in MVP yet."}


@app.post("/books/reindex")
def books_reindex(api_key_ok: None = Depends(require_api_key)) -> Dict[str, Any]:
    return {"ok": True, "message": "Reindex not implemented in MVP yet."}


@app.get("/books/status")
def books_status(api_key_ok: None = Depends(require_api_key)) -> Dict[str, Any]:
    return {
        "booksIndexed": 0,
        "totalChunks": 0,
        "totalVectors": 0,
        "lastIngestion": None,
        "topicCoverage": {},
    }

