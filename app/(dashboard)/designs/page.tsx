// src/app/(dashboard)/designs/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listDesigns } from "@/lib/actions/designs";
import {
  Search,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface DesignListItem {
  id: string;
  title: string;
  difficulty: string;
  score: number | null;
  completionStatus: number | null;
  updatedAt: string | Date;
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DesignsPage() {
  const [designs, setDesigns] = useState<DesignListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDesigns = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const data = await listDesigns(token, { limit: 100 });
      setDesigns(data.designs as DesignListItem[]);
    };

    fetchDesigns();
  }, []);

  const filteredDesigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return designs;

    return designs.filter((design) => design.title.toLowerCase().includes(query));
  }, [designs, searchQuery]);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Designs</h1>
              <p className="text-gray-400">
                View and manage all your system design diagrams.
              </p>
            </div>
<Link href="/create">
              <Button variant="primary">
                <Plus size={20} className="mr-2" />
                New Design
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <Input
                placeholder="Search designs..."
                className="pl-10"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredDesigns.length ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
            <div className="space-y-4">
              {filteredDesigns.map((design) => (
                <Link
                  key={design.id}
                  href={`/editor-new?designId=${design.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-4 hover:border-gray-600 transition-colors"
                >
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {design.title}
                    </h3>
                    <p className="text-gray-400">
                      {design.difficulty} - Updated {formatDate(design.updatedAt)}
                    </p>
                  </div>
                  <ArrowRight size={20} className="text-gray-500" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <div className="inline-block p-4 bg-gray-700 rounded-lg mb-4">
              <svg
                className="w-12 h-12 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2m0-8c0 1.105-1.343 2-3 2s-3-.895-3-2m15-4v2m0 4v2"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No designs yet
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              Get started by creating your first system design diagram. Practice
              with interview problems or create custom designs.
            </p>
<Link href="/create">
              <Button variant="primary">Create Your First Design</Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
