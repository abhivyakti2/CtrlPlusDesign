// src/app/share/[id]/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Copy, Download } from "lucide-react";
import { getDesign } from "@/lib/actions/designs";

interface Design {
  id: string;
  title: string;
  content: unknown;
  problemStatement?: string | null;
  score?: number | null;
  tags?: string[];
}

export default function ShareViewPage() {
  const params = useParams();
  const designId = params.id as string;
  const [design, setDesign] = useState<Design | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        const data = await getDesign(designId);
        setDesign(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load design"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (designId) {
      fetchDesign();
    }
  }, [designId]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!design) return;
    const dataStr = JSON.stringify(design.content, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design.title || "design"}.json`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <SiteHeader />
        <div className="flex items-center justify-center p-4" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-gray-400">Loading design...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="min-h-screen bg-gray-950">
        <SiteHeader />
        <div className="flex items-center justify-center p-4" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <div className="text-center max-w-md">
            <p className="text-2xl font-bold text-white mb-2">
              Design Not Found
            </p>
            <p className="text-gray-400 mb-6">
              {error || "The design you're looking for doesn't exist or has been removed."}
            </p>
            <Button onClick={() => window.location.href = "/dashboard"}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <SiteHeader>
        <div />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
          >
            <Copy size={16} className="mr-2" />
            {copied ? "Copied" : "Copy Link"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </SiteHeader>

      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">{design.title}</h1>
          {design.problemStatement && (
            <p className="text-gray-400 text-sm mt-1">
              {design.problemStatement}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 mt-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400 mb-4">
            This is a shared view-only design. The full interactive editor is available when you create your own designs.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/login">
              <Button variant="secondary">
                View Interactive Editor
              </Button>
            </Link>
          </div>
        </div>

        {/* Design Info */}
        <div className="grid grid-cols-4 gap-4 mt-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-500 text-sm">Design ID</p>
            <p className="text-white font-mono text-sm mt-2 break-all">
              {design.id}
            </p>
          </div>
          {design.score !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-500 text-sm">Score</p>
              <p className="text-white text-2xl font-bold mt-2">
                {design.score}%
              </p>
            </div>
          )}
          {design.tags && design.tags.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 col-span-2">
              <p className="text-gray-500 text-sm mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {design.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#5b7fff] text-white text-xs px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
