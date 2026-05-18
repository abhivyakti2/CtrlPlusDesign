// src/components/ui/button.tsx

import React, { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      iconPosition = "left",
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "rounded-md font-semibold transition-all duration-150 inline-flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

    const variantStyles = {
      primary:
        "bg-accent hover:bg-accent-hover text-white disabled:opacity-50",
      secondary:
        "bg-secondary hover:bg-tertiary text-text-primary disabled:opacity-50",
      ghost:
        "text-text-secondary hover:text-text-primary hover:bg-hover disabled:opacity-50",
      outline:
        "border border-border text-text-primary hover:border-accent hover:text-accent disabled:opacity-50",
      danger:
        "bg-error hover:bg-red-600 text-white disabled:opacity-50",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-sm h-8",
      md: "px-4 py-2 text-base h-10",
      lg: "px-6 py-3 text-lg h-12",
    };

    const content = (
      <>
        {icon && iconPosition === "left" && (
          <span className="flex items-center">{icon}</span>
        )}
        {children}
        {icon && iconPosition === "right" && (
          <span className="flex items-center">{icon}</span>
        )}
      </>
    );

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : (
          content
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
