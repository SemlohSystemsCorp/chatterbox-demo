import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-[6px] block text-[14px] font-medium text-white"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "flex h-[48px] w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 py-[10px] text-[16px] text-white",
            "placeholder:text-[#666]",
            "focus:border-white focus:bg-[#222] focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-[#1a1a1a] disabled:text-[#555]",
            error && "border-[#de1135] focus:border-[#de1135]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-[6px] text-[14px] text-[#de1135]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
