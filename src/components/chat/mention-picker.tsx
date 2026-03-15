"use client";

import { useState, useEffect, useRef } from "react";
import type { MemberData } from "@/lib/chat-helpers";

interface MentionPickerProps {
  members: MemberData[];
  query: string;
  onSelect: (member: MemberData) => void;
  onClose: () => void;
}

export function MentionPicker({
  members,
  query,
  onSelect,
  onClose,
}: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = members.filter((m) => {
    const q = query.toLowerCase();
    return (
      (m.username?.toLowerCase().includes(q) ?? false) ||
      (m.full_name?.toLowerCase().includes(q) ?? false) ||
      m.email.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (filtered.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 z-50 mb-1 max-h-[200px] w-[260px] overflow-auto rounded-[8px] border border-[#2a2a2a] bg-[#111] py-1 shadow-xl"
      ref={listRef}
    >
      {filtered.map((member, i) => {
        const initials = member.full_name
          ? member.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : member.email[0].toUpperCase();

        return (
          <button
            key={member.user_id}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(member);
            }}
            onMouseEnter={() => setSelectedIndex(i)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] ${
              i === selectedIndex
                ? "bg-[#1a1a1a] text-white"
                : "text-[#999] hover:bg-[#1a1a1a]"
            }`}
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#222] text-[8px] font-bold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-white">
                {member.full_name || member.email}
              </div>
              <div className="truncate text-[11px] text-[#555]">
                @{member.username || member.email.split("@")[0]}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
