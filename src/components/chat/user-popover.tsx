"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  MessageSquare,
  UserPlus,
  LogOut,
  DoorOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials, type UserData } from "@/lib/chat-helpers";

interface UserPopoverProps {
  user: UserData;
  isAdmin: boolean;
  onInvite?: () => void;
  /** If provided, shows "Leave Box" option (hidden for owner/admin) */
  boxId?: string;
  boxName?: string;
  boxRole?: string;
}

export function UserPopover({ user, isAdmin, onInvite, boxId, boxName, boxRole }: UserPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canLeaveBox = boxId && boxRole && !["owner", "admin"].includes(boxRole);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleLeaveBox() {
    if (!boxId || leaving) return;
    const confirmed = window.confirm(
      `Are you sure you want to leave ${boxName || "this Box"}? You will lose access to all channels and messages.`
    );
    if (!confirmed) return;

    setLeaving(true);
    try {
      const res = await fetch(`/api/boxes/${boxId}/leave`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to leave Box");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="relative border-t border-[#1a1a1a]" ref={ref}>
      {open && (
        <div className="absolute bottom-full left-2 right-2 z-50 mb-1 rounded-[10px] border border-[#1a1a1a] bg-[#111] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="border-b border-[#1a1a1a] px-3 py-2.5">
            <div className="text-[13px] font-medium text-white">
              {user.fullName || user.email}
            </div>
            <div className="text-[11px] text-[#555]">{user.email}</div>
          </div>
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              All Boxes
            </Link>
            {isAdmin && onInvite && (
              <button
                onClick={() => {
                  setOpen(false);
                  onInvite();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-white"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Invite People
              </button>
            )}
          </div>
          <div className="border-t border-[#1a1a1a] py-1">
            {canLeaveBox && (
              <button
                onClick={handleLeaveBox}
                disabled={leaving}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-[#f59e0b] disabled:opacity-50"
              >
                <DoorOpen className="h-3.5 w-3.5" />
                {leaving ? "Leaving…" : "Leave Box"}
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-[#de1135]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 p-2.5 px-3 transition-colors hover:bg-[#111]"
      >
        <div className="relative">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
              {getInitials(user.fullName, user.email)}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a] bg-[#22c55e]" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-[13px] font-medium text-white">
            {user.fullName || user.email}
          </div>
          <div className="text-[11px] text-[#555]">Online</div>
        </div>
      </button>
    </div>
  );
}
