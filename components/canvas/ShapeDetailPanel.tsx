// src/components/canvas/ShapeDetailPanel.tsx

"use client";

import React, { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { useCanvasStore } from "@/store/canvasStore";
import {
  CodeArtifact,
  CodeLanguage,
  RichTextDocument,
  SchemaArtifact,
  CommentThread,
  SemanticData,
  SemanticRelType,
} from "@/types/canvas";
import { semanticRelLabel } from "@/canvas/semantic";
import {
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Code2,
  MessageSquare,
  Info,
  Link2,
  Database,
  BrainCircuit,
  Network,
  CheckCircle2,
  Circle,
  Copy,
  Check,
} from "lucide-react";

const LANG_COLORS: Record<CodeLanguage, string> = {
  typescript: "#3178c6",
  javascript: "#f7df1e",
  python: "#3572A5",
  java: "#b07219",
  go: "#00ADD8",
  rust: "#dea584",
  cpp: "#f34b7d",
  sql: "#e38c00",
  graphql: "#e10098",
  json: "#292929",
  yaml: "#cb171e",
  markdown: "#083fa1",
  bash: "#89e051",
  proto: "#00b0ff",
  openapi: "#6ba539",
};

const AVAILABLE_LANGUAGES: CodeLanguage[] = [
  "typescript",
  "javascript",
  "python",
  "java",
  "go",
  "rust",
  "cpp",
  "sql",
  "graphql",
  "json",
  "yaml",
  "markdown",
  "bash",
  "proto",
  "openapi",
];

const SEMANTIC_TYPE_OPTIONS: SemanticRelType[] = [
  "api-call",
  "async-event",
  "data-read",
  "data-write",
  "replication",
  "cache-lookup",
  "owns",
  "depends-on",
  "extends",
  "implements",
  "deploys-to",
  "authenticates",
  "custom",
];

function LangBadge({ lang }: { lang: CodeLanguage }) {
  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
      style={{
        background: LANG_COLORS[lang] + "22",
        color: LANG_COLORS[lang],
        border: `1px solid ${LANG_COLORS[lang]}44`,
      }}
    >
      {lang}
    </span>
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightCode(code: string, language: CodeLanguage): string {
  let html = escapeHtml(code);

  if (language === "typescript" || language === "javascript") {
    html = html.replace(/(\/\/.*?$)/gm, '<span class="text-emerald-400">$1</span>');
    html = html.replace(
      /\b(const|let|var|function|class|return|if|else|for|while|async|await|type|interface|export|import|from|new)\b/g,
      '<span class="text-sky-400 font-semibold">$1</span>'
    );
    html = html.replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-amber-300">$1</span>');
  } else if (language === "python") {
    html = html.replace(/(#.*?$)/gm, '<span class="text-emerald-400">$1</span>');
    html = html.replace(
      /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|with|lambda|yield|async|await)\b/g,
      '<span class="text-sky-400 font-semibold">$1</span>'
    );
    html = html.replace(/(".*?"|'.*?')/g, '<span class="text-amber-300">$1</span>');
  } else if (language === "sql") {
    html = html.replace(/(\/\/.*?$|--.*?$)/gm, '<span class="text-emerald-400">$1</span>');
    html = html.replace(
      /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|VALUES|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|BY|ORDER|LIMIT|ALTER|DROP|INDEX|PRIMARY|KEY)\b/g,
      '<span class="text-sky-400 font-semibold">$1</span>'
    );
  } else if (language === "json") {
    html = html.replace(/(&quot;.*?&quot;)(\s*:\s*)/g, '<span class="text-sky-400">$1</span>$2');
    html = html.replace(/(:\s*)(true|false|null|\d+)/g, '$1<span class="text-amber-300">$2</span>');
  } else if (language === "bash") {
    html = html.replace(/(#.*?$)/gm, '<span class="text-emerald-400">$1</span>');
    html = html.replace(/\b(echo|cd|git|npm|pnpm|yarn|pip|python|curl|grep|sed|awk|cat|cp|mv|rm)\b/g, '<span class="text-sky-400 font-semibold">$1</span>');
  }

  return html;
}

function CodePreview({ code, language }: { code: string; language: CodeLanguage }) {
  return (
    <pre
      className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words rounded-md border border-gray-700 bg-gray-950 p-3 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: highlightCode(code || "", language) }}
    />
  );
}

function CodeArtifactEditor({ shapeId, artifact }: { shapeId: string; artifact: CodeArtifact }) {
  const { updateCodeArtifact, deleteCodeArtifact } = useCanvasStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-950">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700">
        <button
          type="button"
          onClick={() =>
            updateCodeArtifact(shapeId, artifact.id, { collapsed: !artifact.collapsed })
          }
          className="text-gray-400 hover:text-white transition-colors"
        >
          {artifact.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        <LangBadge lang={artifact.language} />

        <input
          className="flex-1 bg-transparent text-xs text-gray-300 outline-none placeholder-gray-600 min-w-0"
          placeholder="Block title…"
          value={artifact.title ?? ""}
          onChange={(e) => updateCodeArtifact(shapeId, artifact.id, { title: e.target.value })}
        />

        <button
          type="button"
          onClick={handleCopy}
          className="text-gray-500 hover:text-gray-200 transition-colors"
          title="Copy code"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
        </button>

        <select
          value={artifact.language}
          onChange={(e) => updateCodeArtifact(shapeId, artifact.id, { language: e.target.value as CodeLanguage })}
          className="text-xs bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-300 outline-none"
        >
          {AVAILABLE_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => deleteCodeArtifact(shapeId, artifact.id)}
          className="text-gray-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {!artifact.collapsed && (
        <div className="p-3">
          <div className="rounded-md border border-gray-800 overflow-hidden h-[250px]">
            <Editor
              height="100%"
              language={artifact.language}
              theme="vs-dark"
              value={artifact.content}
              onChange={(value) => updateCodeArtifact(shapeId, artifact.id, { content: value || "" })}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NoteItem({ shapeId, note }: { shapeId: string; note: RichTextDocument }) {
  const { updateNote, deleteNote } = useCanvasStore();
  const [editing, setEditing] = useState(false);

  return (
    <div
      className={`rounded-lg border p-3 text-xs space-y-2 ${
        "border-blue-800 bg-blue-950/30"
      }`}
    >
      <div className="flex items-start gap-2">
        <MessageSquare size={14} className="mt-0.5 text-blue-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea
              autoFocus
              className="w-full bg-gray-800 rounded p-2 text-gray-200 outline-none text-xs font-mono resize-none min-h-[80px]"
              value={note.markdown}
              onChange={(e) => updateNote(shapeId, note.id, { markdown: e.target.value })}
              onBlur={() => setEditing(false)}
            />
          ) : (
            <p className="text-gray-300 whitespace-pre-wrap break-words cursor-text" onClick={() => setEditing(true)}>
              {note.markdown || <span className="text-gray-600 italic">Click to add note…</span>}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => deleteNote(shapeId, note.id)}
          className="text-gray-600 hover:text-red-400 flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex items-center gap-2 text-gray-600">
        <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function CommentThreadItem({ shapeId, thread }: { shapeId: string; thread: CommentThread }) {
  const { addCommentMessage, updateCommentThread, deleteCommentThread } = useCanvasStore();
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{thread.targetType}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateCommentThread(shapeId, thread.id, { resolved: !thread.resolved })}
            className="text-gray-500 hover:text-green-400"
          >
            {thread.resolved ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} />}
          </button>
          <button
            type="button"
            onClick={() => deleteCommentThread(shapeId, thread.id)}
            className="text-gray-600 hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-44 overflow-y-auto">
        {thread.messages.map((message) => (
          <div key={message.id} className="rounded border border-gray-800 bg-gray-950 p-2">
            <p className="text-[11px] text-gray-300 whitespace-pre-wrap">{message.body}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none"
          placeholder="Reply..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            addCommentMessage(shapeId, thread.id, {
              id: `msg-${Date.now()}`,
              body: draft.trim(),
              createdAt: Date.now(),
            });
            setDraft("");
          }}
          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function SyntaxPreview({ markdown }: { markdown: string }) {
  const preview = useMemo(() => {
    const lines = markdown.split("\n").filter(Boolean);
    if (lines.length === 0) {
      return '<span class="text-gray-600 italic">No rich text yet.</span>';
    }

    return lines
      .map((line) => {
        if (line.startsWith("# ")) return `<div class="text-xl font-bold text-white">${line.slice(2)}</div>`;
        if (line.startsWith("## ")) return `<div class="text-lg font-semibold text-white">${line.slice(3)}</div>`;
        if (line.startsWith("### ")) return `<div class="text-base font-semibold text-white">${line.slice(4)}</div>`;
        if (line.startsWith("- ")) return `<div class="text-gray-200">• ${line.slice(2)}</div>`;
        return `<div class="text-gray-300">${line}</div>`;
      })
      .join("");
  }, [markdown]);

  return <div className="space-y-1" dangerouslySetInnerHTML={{ __html: preview }} />;
}

export function ShapeDetailPanel() {
  const {
    editorState,
    closeDetailPanel,
    getShape,
    updateShape,
    getNodeContent,
    updateNodeSemantic,
    addCodeArtifact,
    addSchemaArtifact,
    updateSchemaArtifact,
    deleteSchemaArtifact,
    addNote,
    addCommentThread,
    getArrowsForShape,
    getAllShapes,
    updateArrow,
    getArchitectureNode,
  } = useCanvasStore();

  const shapeId = editorState.detailShapeId;
  const shape = shapeId ? getShape(shapeId) : null;
  const [activeTab, setActiveTab] = useState<
    "overview" | "notes" | "api" | "database" | "code" | "comments" | "relations" | "ai"
  >("overview");

  if (!shape) return null;

  const arrows = shapeId ? getArrowsForShape(shapeId) : [];
  const allShapes = getAllShapes();
  const architectureNode = getArchitectureNode(shape.id);
  const content = getNodeContent(shape.id);
  const codeArtifacts = content.codeArtifacts;
  const notes = content.notes;
  const apiSchemas = content.schemas.filter((schema) => schema.kind === "openapi");
  const databaseSchemas = content.schemas.filter((schema) => schema.kind === "sql");
  const commentThreads = content.comments;
  const semantic = architectureNode?.semantic ?? {
    nodeType: "custom",
    role: "",
    technologies: [],
    protocols: [],
  };

  const handleAddCodeBlock = (language: CodeLanguage) => {
    addCodeArtifact(shape.id, {
      id: `artifact-${Date.now()}`,
      language,
      type: "source-code",
      content: "",
      title: `${language} file`,
      collapsed: false,
    });
  };

  const handleAddNote = () => {
    addNote(shape.id, {
      id: `note-${Date.now()}`,
      title: "Architecture Note",
      markdown: "",
      updatedAt: Date.now(),
    });
  };

  const handleAddApiSchema = () => {
    addSchemaArtifact(shape.id, {
      id: `schema-${Date.now()}`,
      kind: "openapi",
      title: "OpenAPI Spec",
      content: "openapi: 3.0.0\ninfo:\n  title: Service API\n  version: 1.0.0\npaths: {}",
      updatedAt: Date.now(),
    });
  };

  const handleAddDatabaseSchema = () => {
    addSchemaArtifact(shape.id, {
      id: `sql-${Date.now()}`,
      kind: "sql",
      title: "Database Schema",
      content: "-- Write SQL schema or migration preview here",
      updatedAt: Date.now(),
    });
  };

  const handleAddCommentThread = () => {
    addCommentThread(shape.id, {
      id: `thread-${Date.now()}`,
      targetType: "node",
      targetId: shape.id,
      resolved: false,
      messages: [],
    });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <Info size={13} /> },
    { id: "notes", label: "Notes", icon: <MessageSquare size={13} /> },
    { id: "api", label: "APIs", icon: <Network size={13} /> },
    { id: "database", label: "Database", icon: <Database size={13} /> },
    { id: "code", label: "Code", icon: <Code2 size={13} /> },
    { id: "comments", label: "Comments", icon: <MessageSquare size={13} /> },
    { id: "relations", label: "Relations", icon: <Link2 size={13} /> },
    { id: "ai", label: "AI Analysis", icon: <BrainCircuit size={13} /> },
  ] as const;

  return (
    <aside className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-96 flex-shrink-0 overflow-hidden rounded-l-xl shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: shape.fillColor }} />
          <input
            className="text-sm font-medium text-gray-100 bg-transparent outline-none truncate min-w-0"
            value={shape.label}
            placeholder="Shape label…"
            onChange={(e) => updateShape(shape.id, { label: e.target.value })}
          />
        </div>
        <button type="button" onClick={closeDetailPanel} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="flex border-b border-gray-800 bg-gray-950 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors justify-center whitespace-nowrap ${
              activeTab === tab.id ? "text-blue-400 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <div className="p-4 space-y-4">
            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Node Type</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                value={semantic.nodeType}
                onChange={(e) => updateNodeSemantic(shape.id, { nodeType: e.target.value as SemanticData["nodeType"] })}
              >
                <option value="service">service</option>
                <option value="database">database</option>
                <option value="cache">cache</option>
                <option value="queue">queue</option>
                <option value="gateway">gateway</option>
                <option value="frontend">frontend</option>
                <option value="worker">worker</option>
                <option value="load-balancer">load-balancer</option>
                <option value="auth">auth</option>
                <option value="storage">storage</option>
                <option value="external">external</option>
                <option value="custom">custom</option>
              </select>
            </section>

            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semantic Role</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                placeholder="e.g. primary-database, api-gateway…"
                value={semantic.role ?? ""}
                onChange={(e) => updateNodeSemantic(shape.id, { role: e.target.value })}
              />
            </section>

            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tech Stack</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                placeholder="Node.js, PostgreSQL, Redis…"
                value={(semantic.technologies ?? []).join(", ")}
                onChange={(e) => {
                  const technologies = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  updateNodeSemantic(shape.id, { technologies });
                }}
              />
            </section>

            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Team Owner</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                placeholder="@team or team name…"
                value={semantic.ownership?.owner ?? ""}
                onChange={(e) => updateNodeSemantic(shape.id, { ownership: { owner: e.target.value } })}
              />
            </section>

            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">SLA (ms)</label>
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                placeholder="e.g. 200"
                value={shape.metadata?.slaMs ?? ""}
                onChange={(e) =>
                  updateShape(shape.id, {
                    metadata: { ...shape.metadata, slaMs: Number(e.target.value) },
                  })
                }
              />
            </section>

            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scaling Policy</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                value={semantic.scaling?.mode ?? ""}
                onChange={(e) => updateNodeSemantic(shape.id, { scaling: { mode: e.target.value as "horizontal" | "vertical" | "auto" | "none" } })}
              >
                <option value="">— select —</option>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="auto">Auto-scaling</option>
                <option value="none">None / Single</option>
              </select>
            </section>

            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Canvas Label Text</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 min-h-[120px] resize-y"
                placeholder="This is lightweight label metadata shown in overview."
                value={(shape.metadata?.richDescription as string) ?? ""}
                onChange={(e) =>
                  updateShape(shape.id, {
                    metadata: { ...shape.metadata, richDescription: e.target.value },
                  })
                }
              />
              <div className="mt-2 rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-200">
                <SyntaxPreview markdown={(shape.metadata?.richDescription as string) ?? ""} />
              </div>
            </section>

            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ports / Interfaces</label>
              <div className="space-y-1.5">
                {(shape.metadata?.ports ?? []).map((port, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none"
                      placeholder="8080"
                      value={port.number}
                      onChange={(e) => {
                        const ports = [...(shape.metadata?.ports ?? [])];
                        ports[index] = { ...ports[index], number: Number(e.target.value) };
                        updateShape(shape.id, { metadata: { ...shape.metadata, ports } });
                      }}
                    />
                    <input
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none"
                      placeholder="name"
                      value={port.name}
                      onChange={(e) => {
                        const ports = [...(shape.metadata?.ports ?? [])];
                        ports[index] = { ...ports[index], name: e.target.value };
                        updateShape(shape.id, { metadata: { ...shape.metadata, ports } });
                      }}
                    />
                    <select
                      className="text-xs bg-gray-800 border border-gray-700 rounded px-1 py-1 text-gray-200 outline-none"
                      value={port.protocol}
                      onChange={(e) => {
                        const ports = [...(shape.metadata?.ports ?? [])];
                        ports[index] = { ...ports[index], protocol: e.target.value };
                        updateShape(shape.id, { metadata: { ...shape.metadata, ports } });
                      }}
                    >
                      <option>TCP</option>
                      <option>UDP</option>
                      <option>HTTP</option>
                      <option>gRPC</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const ports = (shape.metadata?.ports ?? []).filter((_, portIndex) => portIndex !== index);
                        updateShape(shape.id, { metadata: { ...shape.metadata, ports } });
                      }}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const ports = [...(shape.metadata?.ports ?? []), { name: "", number: 80, protocol: "HTTP" }];
                    updateShape(shape.id, { metadata: { ...shape.metadata, ports } });
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus size={12} /> Add Port
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="p-4 space-y-3">
            {notes.length === 0 && <p className="text-xs text-gray-600 text-center py-6">No architecture notes yet.</p>}

            {notes.map((note) => (
              <NoteItem key={note.id} shapeId={shape.id} note={note} />
            ))}

            <button
              type="button"
              onClick={handleAddNote}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-gray-700 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
            >
              <Plus size={13} /> Add Architecture Note
            </button>
          </div>
        )}

        {activeTab === "api" && (
          <div className="p-4 space-y-3">
            {apiSchemas.length === 0 && <p className="text-xs text-gray-600 text-center py-6">No OpenAPI specs attached.</p>}

            {apiSchemas.map((schema) => (
              <div key={schema.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-transparent text-xs text-gray-300 outline-none"
                    value={schema.title}
                    onChange={(e) => updateSchemaArtifact(shape.id, schema.id, { title: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => deleteSchemaArtifact(shape.id, schema.id)}
                    className="text-gray-600 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="rounded-md border border-gray-800 overflow-hidden h-[200px]">
                  <Editor
                    height="100%"
                    language="yaml"
                    theme="vs-dark"
                    value={schema.content}
                    onChange={(value) => updateSchemaArtifact(shape.id, schema.id, { content: value || "" })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddApiSchema}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-gray-700 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
            >
              <Plus size={13} /> Add OpenAPI Spec
            </button>
          </div>
        )}

        {activeTab === "database" && (
          <div className="p-4 space-y-3">
            {databaseSchemas.length === 0 && <p className="text-xs text-gray-600 text-center py-6">No SQL schema artifacts yet.</p>}

            {databaseSchemas.map((schema) => (
              <div key={schema.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-transparent text-xs text-gray-300 outline-none"
                    value={schema.title}
                    onChange={(e) => updateSchemaArtifact(shape.id, schema.id, { title: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => deleteSchemaArtifact(shape.id, schema.id)}
                    className="text-gray-600 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="rounded-md border border-gray-800 overflow-hidden h-[200px]">
                  <Editor
                    height="100%"
                    language="sql"
                    theme="vs-dark"
                    value={schema.content}
                    onChange={(value) => updateSchemaArtifact(shape.id, schema.id, { content: value || "" })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddDatabaseSchema}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-gray-700 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
            >
              <Plus size={13} /> Add SQL Artifact
            </button>
          </div>
        )}

        {activeTab === "code" && (
          <div className="p-4 space-y-3">
            {codeArtifacts.length === 0 && <p className="text-xs text-gray-600 text-center py-6">No code artifacts yet. Add one below.</p>}

            {codeArtifacts.map((artifact) => (
              <CodeArtifactEditor key={artifact.id} shapeId={shape.id} artifact={artifact} />
            ))}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Block</p>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_LANGUAGES.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => handleAddCodeBlock(language)}
                    className="text-[10px] px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors font-mono uppercase"
                  >
                    {language}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "comments" && (
          <div className="p-4 space-y-3">
            {commentThreads.length === 0 && <p className="text-xs text-gray-600 text-center py-6">No comment threads yet.</p>}

            {commentThreads.map((thread) => (
              <CommentThreadItem key={thread.id} shapeId={shape.id} thread={thread} />
            ))}

            <button
              type="button"
              onClick={handleAddCommentThread}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-gray-700 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
            >
              <Plus size={13} /> Add Comment Thread
            </button>
          </div>
        )}

        {activeTab === "relations" && (
          <div className="p-4 space-y-3">
            {arrows.length === 0 && <p className="text-xs text-gray-600 text-center py-6">No connections yet. Draw an arrow from/to this shape.</p>}

            {arrows.map((arrow) => {
              const otherShapeId = arrow.fromShapeId === shape.id ? arrow.toShapeId : arrow.fromShapeId;
              const otherShape = allShapes.find((candidate) => candidate.id === otherShapeId);
              const isOutgoing = arrow.fromShapeId === shape.id;

              return (
                <div key={arrow.id} className="border border-gray-700 rounded-lg p-3 bg-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`font-semibold ${isOutgoing ? "text-blue-400" : "text-green-400"}`}>
                      {isOutgoing ? "→ outgoing" : "← incoming"}
                    </span>
                    <span className="text-gray-500 flex-1 truncate">{otherShape?.label || otherShapeId}</span>
                  </div>

                  <div className="flex gap-2 items-center">
                    <select
                      value={arrow.semanticType}
                      onChange={(e) =>
                        updateArrow(arrow.id, {
                          semanticType: e.target.value as SemanticRelType,
                        })
                      }
                      className="flex-1 text-xs bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none"
                    >
                      {SEMANTIC_TYPE_OPTIONS.map((semanticType) => (
                        <option key={semanticType} value={semanticType}>
                          {semanticRelLabel(semanticType)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 outline-none"
                    placeholder="Arrow label…"
                    value={arrow.label ?? ""}
                    onChange={(e) => updateArrow(arrow.id, { label: e.target.value })}
                  />

                  <input
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 outline-none"
                    placeholder="Description / notes…"
                    value={arrow.description ?? ""}
                    onChange={(e) => updateArrow(arrow.id, { description: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "ai" && (
          <div className="p-4 space-y-3">
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-2 text-xs">
              <p className="text-gray-300">AI context is attached to architecture nodes, not canvas shapes.</p>
              <p className="text-gray-500">Planned analyses: SPOFs, internet exposure, auth gaps, dependency impact, and bottleneck checks.</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-950 p-3 text-xs text-gray-400">
              <p>Node summary preview:</p>
              <p className="mt-1 text-gray-300">{semantic.nodeType} • {(semantic.technologies ?? []).length} tech tags • {codeArtifacts.length} code artifacts • {apiSchemas.length} APIs • {databaseSchemas.length} DB specs</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}