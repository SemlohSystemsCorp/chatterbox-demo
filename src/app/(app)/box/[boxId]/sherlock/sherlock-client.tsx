"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Hash,
  Lock,
  Send,
  Plus,
  Smile,
  ChevronDown,
  Check,
  UserPlus,
  MessageSquare,
  LogOut,
  Bot,
  Circle,
  Sparkles,
} from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { CreateChannelModal } from "@/components/modals/create-channel-modal";
import { InviteModal } from "@/components/modals/invite-modal";
import { createClient } from "@/lib/supabase/client";

// ── Types ──

interface BoxData {
  id: string;
  short_id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  plan: string;
  role: string;
}

interface SidebarChannel {
  id: string;
  short_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
}

interface MemberData {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
}

interface SherlockMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface SherlockClientProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  boxes: BoxData[];
  box: {
    id: string;
    short_id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_url: string | null;
    plan: string;
    role: string;
  };
  channels: SidebarChannel[];
  members: MemberData[];
}

// ── Sherlock greeting ──

const SHERLOCK_GREETINGS = [
  "Elementary, my dear friend. How may I assist you today?",
  "Ah, a new case! What mystery shall we unravel?",
  "The game is afoot! What brings you to me?",
  "I've been expecting you. What's on your mind?",
  "At your service. Every puzzle has a solution — let's find yours.",
];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Component ──

export function SherlockClient({
  user,
  boxes,
  box,
  channels,
  members,
}: SherlockClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<SherlockMessage[]>([
    {
      id: "greeting",
      role: "assistant",
      content: SHERLOCK_GREETINGS[Math.floor(Math.random() * SHERLOCK_GREETINGS.length)],
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [dmLoading, setDmLoading] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Modals
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Box switcher
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const isAdmin = box.role === "owner" || box.role === "admin";
  const otherMembers = members.filter((m) => m.user_id !== user.id);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const content = input.trim();
    if (!content || typing) return;

    const userMsg: SherlockMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      // Build conversation history (exclude the greeting message)
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "greeting")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/sherlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ box_id: box.id, messages: history }),
      });
      const data = await res.json();

      const assistantMsg: SherlockMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content || "I wasn't able to process that. Could you try rephrasing?",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: SherlockMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setTyping(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function startDm(targetUserId: string) {
    setDmLoading(targetUserId);
    try {
      const res = await fetch("/api/conversations/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      const data = await res.json();
      if (data.short_id) {
        router.push(`/dm/${data.short_id}?box=${box.short_id}`);
      }
    } finally {
      setDmLoading(null);
    }
  }

  const boxInitials = box.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar — same as channel page */}
      <div className="flex w-[240px] shrink-0 flex-col border-r border-[#1a1a1a] bg-[#0a0a0a]">
        {/* Box header with switcher */}
        <div className="relative" ref={switcherRef}>
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex h-14 w-full items-center gap-2.5 border-b border-[#1a1a1a] px-4 transition-colors hover:bg-[#111]"
          >
            {box.icon_url ? (
              <img src={box.icon_url} alt="" className="h-7 w-7 rounded-[5px]" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-white text-[9px] font-bold text-black">
                {boxInitials}
              </div>
            )}
            <span className="truncate text-[14px] font-semibold text-white">
              {box.name}
            </span>
            <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 text-[#555] transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
          </button>

          {switcherOpen && (
            <div className="absolute left-0 top-full z-50 w-full rounded-b-[10px] border border-t-0 border-[#1a1a1a] bg-[#111] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#444]">
                Switch Box
              </div>
              {boxes.map((b) => {
                const isCurrent = b.short_id === box.short_id;
                const initials = b.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSwitcherOpen(false);
                      if (!isCurrent) router.push(`/box/${b.short_id}`);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${isCurrent ? "bg-[#1a1a1a]" : "hover:bg-[#1a1a1a]"}`}
                  >
                    {b.icon_url ? (
                      <img src={b.icon_url} alt="" className="h-6 w-6 rounded-[4px]" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-white text-[8px] font-bold text-black">
                        {initials}
                      </div>
                    )}
                    <span className="truncate text-[13px] text-white">{b.name}</span>
                    {isCurrent && <Check className="ml-auto h-3.5 w-3.5 text-white" />}
                  </button>
                );
              })}
              <div className="border-t border-[#1a1a1a] mt-1 pt-1">
                <Link
                  href="/create/box"
                  onClick={() => setSwitcherOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create a new Box
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Channels + DMs */}
        <div className="flex-1 overflow-auto px-2 py-3">
          <div className="mb-1.5 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#444]">
              Channels
            </span>
            <button
              onClick={() => setCreateChannelOpen(true)}
              className="flex h-4 w-4 items-center justify-center rounded text-[#444] hover:text-white"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-0.5">
            {channels.map((ch) => (
              <Link
                key={ch.id}
                href={`/box/${box.short_id}/c/${ch.short_id}`}
                className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-[#666] transition-colors hover:bg-[#111] hover:text-[#aaa]"
              >
                {ch.is_private ? (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                ) : (
                  <Hash className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                )}
                <span className="truncate">{ch.name}</span>
              </Link>
            ))}
          </div>

          {/* Direct Messages */}
          <div className="mt-5 mb-1.5 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#444]">
              Direct Messages
            </span>
          </div>
          <div className="space-y-0.5">
            {/* Sherlock AI — active */}
            <div className="flex items-center gap-2 rounded-[6px] bg-[#1a1a1a] px-2 py-1.5 text-[13px] font-medium text-white">
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#276ef1]">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <span className="truncate">Sherlock</span>
              <span className="ml-auto rounded bg-[#276ef1]/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#276ef1]">
                AI
              </span>
            </div>

            {/* Workspace members */}
            {otherMembers.map((m) => {
              const initials = m.full_name
                ? m.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                : m.email[0].toUpperCase();
              const statusColor =
                m.status === "online" ? "bg-[#22c55e]" :
                m.status === "away" ? "bg-[#f59e0b]" :
                m.status === "dnd" ? "bg-[#de1135]" :
                "bg-[#555]";
              return (
                <button
                  key={m.user_id}
                  onClick={() => startDm(m.user_id)}
                  disabled={dmLoading === m.user_id}
                  className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-[#666] transition-colors hover:bg-[#111] hover:text-[#aaa] disabled:opacity-50"
                >
                  <div className="relative h-5 w-5 shrink-0">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a1a1a] text-[8px] font-bold text-white">
                        {initials}
                      </div>
                    )}
                    <Circle className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${statusColor} fill-current stroke-[#0a0a0a] stroke-[3]`} />
                  </div>
                  <span className="truncate">{m.full_name || m.email}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar bottom actions */}
        <div className="border-t border-[#1a1a1a] p-2 space-y-0.5">
          {isAdmin && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] text-[#666] transition-colors hover:bg-[#111] hover:text-white"
            >
              <UserPlus className="h-4 w-4" />
              Invite People
            </button>
          )}
          <Link
            href="/dashboard"
            className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] text-[#666] transition-colors hover:bg-[#111] hover:text-white"
          >
            <MessageSquare className="h-4 w-4" />
            All Boxes
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] text-[#666] transition-colors hover:bg-[#111] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Sherlock header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#1a1a1a] px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#276ef1]">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold text-white">Sherlock</h1>
            </div>
            <span className="rounded bg-[#276ef1]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#276ef1]">
              AI Assistant
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#276ef1]" />
            <span className="text-[11px] text-[#555]">Powered by Chatterbox AI</span>
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 overflow-auto">
          <div className="px-4 py-4">
            {/* Welcome card */}
            <div className="mb-6 rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#276ef1]">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-white">Meet Sherlock</h2>
                  <p className="text-[12px] text-[#555]">Your AI assistant for {box.name}</p>
                </div>
              </div>
              <p className="text-[13px] leading-[20px] text-[#888]">
                I can help you brainstorm ideas, draft messages, answer questions about your workspace, and more.
                Just type a message below to get started.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Summarize today's activity", "What decisions were made this week?", "Draft an announcement", "What can you help with?"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-1 text-[12px] text-[#666] transition-colors hover:border-[#2a2a2a] hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`mb-4 flex gap-3 ${msg.role === "user" ? "" : ""}`}>
                {msg.role === "assistant" ? (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#276ef1]">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="mt-0.5 h-8 w-8 shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-[10px] font-bold text-white">
                        {user.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || user.email[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-white">
                      {msg.role === "assistant" ? "Sherlock" : user.fullName || user.email}
                    </span>
                    <span className="text-[10px] text-[#444]">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <Markdown className="mt-0.5 text-[14px] leading-[22px]">
                    {msg.content}
                  </Markdown>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="mb-4 flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#276ef1]">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <span className="text-[13px] font-semibold text-white">Sherlock</span>
                  <span className="ml-2 text-[12px] text-[#555]">is thinking</span>
                  <span className="ml-1 flex gap-0.5">
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#555] [animation-delay:0ms]" />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#555] [animation-delay:150ms]" />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#555] [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message composer */}
        <div className="shrink-0 px-4 pb-4">
          <div className="rounded-[8px] border border-[#1a1a1a] bg-[#111] focus-within:border-[#2a2a2a]">
            <div className="flex items-end px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Sherlock anything..."
                rows={1}
                className="max-h-[160px] min-h-[28px] flex-1 resize-none bg-transparent px-1 py-1 text-[14px] leading-[22px] text-white placeholder:text-[#555] focus:outline-none"
              />
              <button className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#555] transition-colors hover:text-white">
                <Smile className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-[#1a1a1a] px-3 py-1.5">
              <div className="text-[11px] text-[#444]">
                <kbd className="rounded bg-[#0a0a0a] px-1 py-0.5 text-[10px] text-[#555]">
                  Enter
                </kbd>{" "}
                to send ·{" "}
                <kbd className="rounded bg-[#0a0a0a] px-1 py-0.5 text-[10px] text-[#555]">
                  Shift+Enter
                </kbd>{" "}
                new line
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || typing}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#276ef1] text-white transition-colors hover:bg-[#1f5fd1] disabled:bg-[#1a1a1a] disabled:text-[#555]"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateChannelModal
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        boxId={box.id}
        boxShortId={box.short_id}
      />
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        boxId={box.id}
        boxName={box.name}
      />
    </div>
  );
}
