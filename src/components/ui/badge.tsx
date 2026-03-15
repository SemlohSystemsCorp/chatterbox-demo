import { cn } from "@/utils/cn";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white",
  success: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
