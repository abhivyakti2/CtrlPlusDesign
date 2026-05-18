// src/components/ui/badge.tsx

import React from "react";
import clsx from "clsx";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-accent/20 text-accent border border-accent/30",
    secondary: "",
    success: "bg-success/20 text-success border border-success/30",
    warning: "bg-warning/20 text-warning border border-warning/30",
    error: "bg-error/20 text-error border border-error/30",
    info: "bg-accent/20 text-accent border border-accent/30",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium rounded",
    md: "px-3 py-1 text-sm font-medium rounded-md",
    lg: "px-4 py-1.5 text-base font-medium rounded-md",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Badge.displayName = "Badge";
