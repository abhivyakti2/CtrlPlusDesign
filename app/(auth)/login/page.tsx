// src/app/(auth)/login/page.tsx

"use client";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-gray-400">
          Sign in to your account to continue practicing system design
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
