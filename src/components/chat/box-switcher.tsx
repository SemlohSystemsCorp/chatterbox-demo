"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus } from "lucide-react";
import type { BoxData } from "@/lib/chat-helpers";

interface BoxSwitcherProps {
  boxes: BoxData[];
  currentBox: BoxData;
}

export function BoxSwitcher({ boxes, currentBox }: BoxSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const boxInitials = currentBox.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-full items-center gap-2.5 border-b border-[#1a1a1a] px-4 transition-colors hover:bg-[#111]"
      >
        {currentBox.icon_url ? (
          <img
            src={currentBox.icon_url}
            alt=""
            className="h-7 w-7 rounded-[5px]"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-white text-[9px] font-bold text-black">
            {boxInitials}
          </div>
        )}
        <span className="truncate text-[14px] font-semibold text-white">
          {currentBox.name}
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-[#555] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 w-full rounded-b-[10px] border border-t-0 border-[#1a1a1a] bg-[#111] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#444]">
            Switch Box
          </div>
          {boxes.map((b) => {
            const isCurrent = b.short_id === currentBox.short_id;
            const initials = b.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <button
                key={b.id}
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) router.push(`/box/${b.short_id}`);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${isCurrent ? "bg-[#1a1a1a]" : "hover:bg-[#1a1a1a]"}`}
              >
                {b.icon_url ? (
                  <img
                    src={b.icon_url}
                    alt=""
                    className="h-6 w-6 rounded-[4px]"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-white text-[8px] font-bold text-black">
                    {initials}
                  </div>
                )}
                <span className="truncate text-[13px] text-white">
                  {b.name}
                </span>
                {isCurrent && (
                  <Check className="ml-auto h-3.5 w-3.5 text-white" />
                )}
              </button>
            );
          })}
          <div className="mt-1 border-t border-[#1a1a1a] pt-1">
            <Link
              href="/create/box"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Create a new Box
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
