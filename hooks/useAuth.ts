// src/hooks/useAuth.ts

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  experienceLevel: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  login: (token: string, user: User) => void;
}

/**
 * Check if JWT token is expired (client-side validation)
 */
function isTokenExpired(token: string): boolean {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    // Decode payload
    const decoded = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8")
    ) as { exp?: number };

    if (!decoded.exp) return false; // No expiration
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true; // Invalid token format
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const token = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("user");

    // Check if token exists and is not expired
    if (token && !isTokenExpired(token) && userStr) {
      try {
        const userData = JSON.parse(userStr) as User;
        setUser(userData);
      } catch {
        // Invalid user data, clear storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    } else if (token) {
      // Token exists but is expired
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }

    setIsLoading(false);
  }, [isMounted]);

  const login = (token: string, userData: User) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    login,
  };
}
