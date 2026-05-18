// src/components/ui/card.tsx

import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", hoverable = false, className, ...props }, ref) => {
    const variantStyles = {
      default: "bg-secondary border border-border",
      elevated: "bg-secondary shadow-lg",
      bordered: "bg-transparent border-2 border-border",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-lg p-6 transition-all duration-150",
          variantStyles[variant],
          hoverable && "hover:shadow-lg hover:border-accent hover:bg-tertiary",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

// Card Header
export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("mb-4 border-b border-border pb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

// Card Title
export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={clsx("text-xl font-semibold text-text-primary", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

// Card Description
export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx("text-sm text-text-muted", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

// Card Content
export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

// Card Footer
export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("mt-6 border-t border-border pt-4 flex gap-3", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
