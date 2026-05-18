// src/app/(auth)/signup/page.tsx

"use client";

import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Get started</h1>
        <p className="text-gray-400">
          Create an account to begin your system design interview preparation
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
