// src/app/page.tsx

"use client";

import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/site-header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-dark">
      <SiteHeader />
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-gray-400">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}
