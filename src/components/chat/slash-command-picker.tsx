"use client";

import { useState, useEffect, useMemo } from "react";
import { SLASH_COMMANDS, type SlashCommand } from "@/lib/slash-commands";

interface SlashCommandPickerProps {
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandPicker({ query, onSelect, onClose }: SlashCommandPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.name.startsWith(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-[240px] overflow-y-auto rounded-[8px] border border-[#1a1a1a] bg-[#111] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#555]">
        Slash commands
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd)}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === selectedIndex ? "bg-[#1a1a1a]" : "hover:bg-[#141414]"
          }`}
        >
          <span className="shrink-0 rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[12px] font-mono text-[#888]">
            /{cmd.name}
          </span>
          <span className="truncate text-[13px] text-[#888]">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
