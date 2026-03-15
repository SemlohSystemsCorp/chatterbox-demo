import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  pill?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-white text-black hover:bg-[#e0e0e0] active:bg-[#ccc]",
  secondary:
    "bg-[#1a1a1a] text-white hover:bg-[#252525] active:bg-[#333]",
  ghost:
    "text-white hover:bg-[#1a1a1a] active:bg-[#252525]",
  danger:
    "bg-[#de1135] text-white hover:bg-[#c40e2f] active:bg-[#a80c28]",
  outline:
    "border-2 border-[#2a2a2a] text-white hover:bg-[#1a1a1a] active:bg-[#252525]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-[36px] px-4 text-[14px]",
  md: "h-[48px] px-5 text-[16px]",
  lg: "h-[52px] px-8 text-[16px]",
  icon: "h-[48px] w-[48px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      pill = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-[background-color] duration-200",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[#276ef1]",
          "disabled:bg-[#1a1a1a] disabled:text-[#555] disabled:cursor-not-allowed",
          pill ? "rounded-full" : "rounded-[8px]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="mr-2 h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
