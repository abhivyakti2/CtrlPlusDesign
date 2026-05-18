// src/app/(auth)/layout.tsx

import { AuthLayout } from "@/components/auth/auth-layout";

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
