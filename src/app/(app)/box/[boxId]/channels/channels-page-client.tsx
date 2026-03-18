"use client";

import { useState } from "react";
import Link from "next/link";
import { HashIcon as Hash, LockIcon as Lock, PlusIcon as Plus, ArrowLeftIcon as ArrowLeft, ArrowRightIcon as ArrowRight, SearchIcon as Search } from "@primer/octicons-react";
import { AppShell } from "@/components/layout/app-shell";
import { CreateChannelModal } from "@/components/modals/create-channel-modal";

interface BoxData {
  id: string;
  short_id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  plan: string;
  role: string;
}

interface ChannelData {
  id: string;
  short_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
}

interface ChannelsPageClientProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  boxes: BoxData[];
  box: BoxData & { description: string | null };
  channels: ChannelData[];
}

export function ChannelsPageClient({
  user,
  boxes,
  box,
  channels,
}: ChannelsPageClientProps) {
  const isAdmin = box.role === "owner" || box.role === "admin";
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? channels.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : channels;

  return (
    <AppShell user={user} boxes={boxes} activeBoxId={box.short_id} hideSidebar>
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#1a1a1a] px-5">
        <Link
          href={`/box/${box.short_id}`}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#555] transition-colors hover:bg-[#1a1a1a] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          {box.icon_url ? (
            <img src={box.icon_url} alt="" className="h-6 w-6 rounded-[4px]" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-white text-[9px] font-bold text-black">
              {box.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-[15px] font-semibold text-white">Channels</span>
          <span className="text-[13px] text-[#555]">({channels.length})</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[720px] px-6 py-6">
          {/* Search + Create */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-[#1a1a1a] bg-[#0f0f0f] pl-9 pr-3 text-[13px] text-white placeholder:text-[#444] focus:border-[#333] focus:outline-none"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => setCreateChannelOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-[8px] bg-white px-3 text-[13px] font-medium text-black transition-colors hover:bg-[#ddd]"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            )}
          </div>

          {/* Channel list */}
          {filtered.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#222] py-10 text-center">
              <Hash className="mx-auto mb-2 h-6 w-6 text-[#444]" />
              <p className="text-[13px] text-[#666]">
                {search.trim() ? "No channels match your search" : "No channels yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/box/${box.short_id}/c/${channel.short_id}`}
                  className="group flex items-center gap-3 rounded-[10px] border border-[#1a1a1a] bg-[#0f0f0f] px-4 py-3 transition-colors hover:border-[#2a2a2a] hover:bg-[#111]"
                >
                  {channel.is_private ? (
                    <Lock className="h-4 w-4 shrink-0 text-[#555]" />
                  ) : (
                    <Hash className="h-4 w-4 shrink-0 text-[#555]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[14px] font-medium text-white">
                      {channel.name}
                    </span>
                    {channel.description && (
                      <p className="truncate text-[12px] text-[#555]">
                        {channel.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#333] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-[#666] group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateChannelModal
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        boxId={box.id}
        boxShortId={box.short_id}
      />
    </AppShell>
  );
}
