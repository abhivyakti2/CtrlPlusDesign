// src/components/ui/alert.tsx

import React from "react";
import clsx from "clsx";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = "info",
      icon,
      dismissible = false,
      onDismiss,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      info: "bg-accent/10 border border-accent/30 text-accent",
      success: "bg-success/10 border border-success/30 text-success",
      warning: "bg-warning/10 border border-warning/30 text-warning",
      error: "bg-error/10 border border-error/30 text-error",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-lg p-4 flex items-start gap-3",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        
        <div className="flex-1">
          {children}
        </div>

        {dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 ml-2 opacity-50 hover:opacity-100 transition-opacity"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = "Alert";
