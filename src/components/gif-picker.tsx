"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { Search, X } from "lucide-react";
import type { IGif } from "@giphy/js-types";

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "";

const CATEGORIES = [
  { label: "Trending", query: "" },
  { label: "Reactions", query: "reactions" },
  { label: "Laugh", query: "laugh" },
  { label: "Sad", query: "sad" },
  { label: "Love", query: "love" },
  { label: "Wow", query: "wow" },
  { label: "Thumbs Up", query: "thumbs up" },
  { label: "High Five", query: "high five" },
  { label: "Celebrate", query: "celebrate" },
  { label: "Dance", query: "dance" },
];

interface GifPickerProps {
  onSelect: (gif: { url: string; title: string; width: number; height: number }) => void;
  children: React.ReactNode;
}

export function GifPicker({ onSelect, children }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gfRef = useRef<GiphyFetch | null>(null);

  if (!gfRef.current && API_KEY) {
    gfRef.current = new GiphyFetch(API_KEY);
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      requestAnimationFrame(() => inputRef.current?.focus());
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const fetchGifs = useCallback(
    (offset: number) => {
      if (!gfRef.current) return Promise.resolve({ data: [], pagination: { total_count: 0, count: 0, offset: 0 } } as any);
      if (debouncedQuery.trim()) {
        return gfRef.current.search(debouncedQuery, { offset, limit: 10 });
      }
      return gfRef.current.trending({ offset, limit: 10 });
    },
    [debouncedQuery],
  );

  function handleGifClick(gif: IGif, e: React.SyntheticEvent<HTMLElement, Event>) {
    e.preventDefault();
    onSelect({
      url: gif.images.fixed_height.url || gif.images.original.url,
      title: gif.title || "",
      width: gif.images.original.width,
      height: gif.images.original.height,
    });
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
  }

  if (!API_KEY) {
    return <>{children}</>;
  }

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{children}</div>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-[380px] overflow-hidden rounded-[10px] border border-[#1a1a1a] bg-[#111] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Search */}
          <div className="border-b border-[#1a1a1a] p-2">
            <div className="flex items-center gap-2 rounded-[6px] bg-[#0a0a0a] px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#555]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search GIFs..."
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#555] focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setDebouncedQuery(""); }}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[#555] hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          {!query && (
            <div className="flex gap-1 overflow-x-auto border-b border-[#1a1a1a] px-2 py-1.5 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => {
                    setQuery(cat.query);
                    setDebouncedQuery(cat.query);
                  }}
                  className="shrink-0 rounded-full bg-[#1a1a1a] px-2.5 py-1 text-[11px] text-[#888] transition-colors hover:bg-[#222] hover:text-white"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="h-[300px] overflow-y-auto p-1">
            <Grid
              key={debouncedQuery}
              width={364}
              columns={2}
              gutter={6}
              fetchGifs={fetchGifs}
              onGifClick={handleGifClick}
              noLink
              hideAttribution
            />
          </div>

          {/* Attribution */}
          <div className="flex items-center justify-center border-t border-[#1a1a1a] py-1.5">
            <span className="text-[10px] text-[#444]">Powered by GIPHY</span>
          </div>
        </div>
      )}
    </div>
  );
}
