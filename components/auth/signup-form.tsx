// src/components/auth/signup-form.tsx

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signupUser } from "@/lib/actions/auth";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  experienceLevel: z.enum([
    "FRESHER",
    "SDE1",
    "SDE2",
    "SENIOR_ENGINEER",
    "STAFF_ENGINEER",
    "ARCHITECT",
  ]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export const SignupForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      experienceLevel: "FRESHER",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signupUser(
        data.email,
        data.password,
        data.experienceLevel
      );
      
      // Store token and user data
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Join ArchitectIQ and start practicing system design
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Experience Level
            </label>
            <select
              className="w-full px-4 py-2 rounded-md border bg-tertiary text-text-primary border-border focus:border-accent focus:ring-2 focus:ring-accent focus:ring-opacity-20"
              {...register("experienceLevel")}
            >
              <option value="FRESHER">Fresher</option>
              <option value="SDE1">SDE-1</option>
              <option value="SDE2">SDE-2</option>
              <option value="SENIOR_ENGINEER">Senior Engineer</option>
              <option value="STAFF_ENGINEER">Staff Engineer</option>
              <option value="ARCHITECT">Architect</option>
            </select>
          </div>

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            helpText="At least 8 characters"
            {...register("password")}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Create Account
          </Button>

          <div className="text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:text-accent-hover font-semibold">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
