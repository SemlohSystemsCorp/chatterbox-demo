"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CommentDiscussionIcon as MessageSquare, PlusIcon as Plus, SearchIcon as Search, BookmarkIcon as Bookmark, PeopleIcon as Users, ArrowLeftIcon as ArrowLeft, LoopIcon as Loader2 } from "@primer/octicons-react";
import { NewDmModal } from "@/components/modals/new-dm-modal";
import { createClient } from "@/lib/supabase/client";
import { getInitials, type UserData } from "@/lib/chat-helpers";

interface ConversationData {
  id: string;
  short_id: string;
  is_group: boolean;
  name: string | null;
  updated_at: string;
  participants: {
    user_id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  }[];
}

interface MessagesClientProps {
  user: UserData;
  conversations: ConversationData[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function MessagesClient({
  user,
  conversations: initialConversations,
}: MessagesClientProps) {
  const router = useRouter();
  const [conversations, setConversations] =
    useState<ConversationData[]>(initialConversations);
  const [search, setSearch] = useState("");
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [startingDm, setStartingDm] = useState(false);

  // Realtime: listen for new conversation participants
  useEffect(() => {
    const supabase = createClient();

    const convSub = supabase
      .channel(`msg-conv-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Refetch conversations
          const { data: participations } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", user.id);

          if (!participations || participations.length === 0) return;

          const convoIds = participations.map((p) => p.conversation_id);

          const [convosResult, participantsResult] = await Promise.all([
            supabase
              .from("conversations")
              .select("id, short_id, is_group, name, created_at, updated_at")
              .in("id", convoIds)
              .order("updated_at", { ascending: false }),
            supabase
              .from("conversation_participants")
              .select(
                "conversation_id, user_id, profiles(id, full_name, email, avatar_url)"
              )
              .in("conversation_id", convoIds),
          ]);

          if (!convosResult.data) return;

          const participantsByConvo = new Map<
            string,
            {
              user_id: string;
              full_name: string;
              email: string;
              avatar_url: string | null;
            }[]
          >();
          for (const p of participantsResult.data ?? []) {
            const profile = p.profiles as unknown as {
              id: string;
              full_name: string;
              email: string;
              avatar_url: string | null;
            };
            const list = participantsByConvo.get(p.conversation_id) ?? [];
            list.push({
              user_id: p.user_id,
              full_name: profile.full_name,
              email: profile.email,
              avatar_url: profile.avatar_url,
            });
            participantsByConvo.set(p.conversation_id, list);
          }

          setConversations(
            convosResult.data.map((c) => ({
              id: c.id,
              short_id: c.short_id,
              is_group: c.is_group,
              name: c.name,
              updated_at: c.updated_at,
              participants: participantsByConvo.get(c.id) ?? [],
            }))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convSub);
    };
  }, [user.id]);

  // Separate self-DM from regular conversations
  const selfDm = conversations.find(
    (c) =>
      !c.is_group &&
      c.participants.length === 1 &&
      c.participants[0].user_id === user.id
  );
  const regularConvos = conversations.filter((c) => c !== selfDm);

  const filtered = search.trim()
    ? regularConvos.filter((c) => {
        const others = c.participants.filter(
          (p) => p.user_id !== user.id
        );
        const name =
          c.name ||
          others.map((p) => p.full_name || p.email).join(", ");
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : regularConvos;

  async function handleSavedMessages() {
    setStartingDm(true);
    try {
      const res = await fetch("/api/conversations/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: user.id }),
      });
      const data = await res.json();
      if (data.short_id) {
        router.push(`/dm/${data.short_id}`);
      }
    } finally {
      setStartingDm(false);
    }
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-[#1a1a1a]">
        {/* Sidebar header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1a1a1a] px-4">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-[15px] font-semibold text-white">
              Messages
            </span>
            <span className="text-[12px] text-[#555]">
              ({regularConvos.length})
            </span>
          </div>
          <button
            onClick={() => setNewDmOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="h-8 w-full rounded-[6px] border border-[#1a1a1a] bg-[#0f0f0f] pl-8 pr-3 text-[12px] text-white placeholder:text-[#444] focus:border-[#333] focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-auto px-2 pb-2">
          {/* Saved Messages */}
          <button
            onClick={handleSavedMessages}
            disabled={startingDm}
            className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[13px] text-[#666] transition-colors hover:bg-[#111] hover:text-[#aaa] disabled:opacity-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a]">
              <Bookmark className="h-4 w-4 text-[#888]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[14px] font-medium text-white">
                Saved Messages
              </span>
            </div>
          </button>

          {/* Conversations */}
          {filtered.length === 0 && search.trim() && (
            <p className="py-6 text-center text-[12px] text-[#555]">
              No conversations match
            </p>
          )}

          {filtered.map((c) => {
            const others = c.participants.filter(
              (p) => p.user_id !== user.id
            );
            const displayName =
              c.name ||
              others
                .map((p) => p.full_name || p.email)
                .join(", ") ||
              "Unknown";
            const firstOther = others[0];
            const isGroup = c.is_group || others.length > 1;

            return (
              <Link
                key={c.id}
                href={`/dm/${c.short_id}`}
                className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[13px] text-[#666] transition-colors hover:bg-[#111] hover:text-[#aaa]"
              >
                {isGroup ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a]">
                    <Users className="h-4 w-4 text-[#888]" />
                  </div>
                ) : firstOther?.avatar_url ? (
                  <img
                    src={firstOther.avatar_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                    {getInitials(
                      firstOther?.full_name || "",
                      firstOther?.email || ""
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] font-medium text-white">
                      {displayName}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#444]">
                      {timeAgo(c.updated_at)}
                    </span>
                  </div>
                  {isGroup && (
                    <span className="text-[11px] text-[#555]">
                      {c.participants.length} members
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {regularConvos.length === 0 && !search.trim() && (
            <div className="py-10 text-center">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 text-[#333]" />
              <p className="text-[13px] text-[#555]">No conversations yet</p>
              <button
                onClick={() => setNewDmOpen(true)}
                className="mt-2 text-[13px] font-medium text-white transition-colors hover:text-[#ccc]"
              >
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content — empty state */}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111]">
            <MessageSquare className="h-8 w-8 text-[#333]" />
          </div>
          <h2 className="text-[18px] font-semibold text-white">
            Your Messages
          </h2>
          <p className="mt-1 max-w-[280px] text-[14px] text-[#555]">
            Select a conversation from the sidebar or start a new one.
          </p>
          <button
            onClick={() => setNewDmOpen(true)}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-white px-4 text-[13px] font-medium text-black transition-colors hover:bg-[#ddd]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Message
          </button>
        </div>
      </div>

      <NewDmModal
        open={newDmOpen}
        onClose={() => setNewDmOpen(false)}
        currentUserId={user.id}
      />
    </div>
  );
}
