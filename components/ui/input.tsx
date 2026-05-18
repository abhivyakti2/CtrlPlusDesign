// src/components/ui/input.tsx

import React, { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helpText, icon, className, type = "text", ...props },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            type={type}
            name={props.name ?? props.id}
            id={props.id ?? props.name}
            className={clsx(

              "w-full px-4 py-2 rounded-md border transition-all duration-150",
              "bg-tertiary text-text-primary placeholder-text-muted",
              "border-border focus:border-accent focus:ring-2 focus:ring-accent focus:ring-opacity-20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-error focus:ring-error focus:ring-opacity-20",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>

        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1 text-sm text-text-muted">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helpText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          className={clsx(
            "w-full px-4 py-2 rounded-md border transition-all duration-150",
            "bg-tertiary text-text-primary placeholder-text-muted",
            "border-border focus:border-accent focus:ring-2 focus:ring-accent focus:ring-opacity-20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "resize-none",
            error && "border-error focus:ring-error focus:ring-opacity-20",
            className
          )}
          {...props}
        />

        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1 text-sm text-text-muted">{helpText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
