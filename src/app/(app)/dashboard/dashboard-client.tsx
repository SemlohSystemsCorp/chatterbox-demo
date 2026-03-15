"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Link as LinkIcon,
  Hash,
  Users,
  ArrowRight,
  Crown,
  Shield,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/stores/settings-store";
import { createClient } from "@/lib/supabase/client";
import { getInitials, type BoxData, type UserData } from "@/lib/chat-helpers";

interface DashboardClientProps {
  user: UserData;
  boxes: BoxData[];
  boxStats: Record<string, { channels: number; members: number }>;
}

function getRoleBadge(role: string) {
  if (role === "owner")
    return { icon: Crown, label: "Owner", color: "text-amber-400" };
  if (role === "admin")
    return { icon: Shield, label: "Admin", color: "text-blue-400" };
  return null;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardClient({ user, boxes, boxStats }: DashboardClientProps) {
  const router = useRouter();
  const firstName = user.fullName?.split(" ")[0] || "there";
  const { loaded, loadFromServer } = useSettingsStore();

  useEffect(() => {
    if (!loaded) loadFromServer();
  }, [loaded, loadFromServer]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1a1a1a] px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
            <MessageSquare className="h-4 w-4 text-black" />
          </div>
          <span className="text-[15px] font-bold text-white">Chatterbox</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <div className="mx-1 h-5 w-px bg-[#1a1a1a]" />
          <button
            onClick={handleSignOut}
            className="flex h-8 items-center gap-2 rounded-[8px] px-2.5 text-[13px] text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-black">
                {getInitials(user.fullName, user.email)}
              </div>
            )}
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[800px] px-6 py-8">
          {/* Greeting */}
          <div className="mb-6">
            <h2 className="text-[22px] font-bold tracking-tight text-white">
              {getGreeting()}, {firstName}
            </h2>
            <p className="mt-1 text-[14px] text-[#666]">
              {boxes.length === 0
                ? "Get started by creating or joining a workspace."
                : `You're in ${boxes.length} workspace${boxes.length !== 1 ? "s" : ""}.`}
            </p>
          </div>

          {/* Quick Actions — only show when no boxes */}
          {boxes.length === 0 && (
            <div className="mb-8 grid grid-cols-2 gap-3">
              <Link
                href="/create/box"
                className="group flex items-center gap-4 rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-5 transition-colors hover:border-[#2a2a2a] hover:bg-[#111]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white text-black">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">
                    Create a Box
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#555]">
                    Start a new workspace for your team
                  </div>
                </div>
              </Link>
              <Link
                href="/join"
                className="group flex items-center gap-4 rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-5 transition-colors hover:border-[#2a2a2a] hover:bg-[#111]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#1a1a1a] text-white">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">
                    Join a Box
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#555]">
                    Enter an invite code or link
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Boxes Grid */}
          {boxes.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#444]">
                  Your Boxes
                </h3>
                <div className="flex gap-2">
                  <Link
                    href="/join"
                    className="text-[12px] font-medium text-[#555] transition-colors hover:text-white"
                  >
                    Join
                  </Link>
                  <Link
                    href="/create/box"
                    className="text-[12px] font-medium text-[#555] transition-colors hover:text-white"
                  >
                    + New
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {boxes.map((box) => {
                  const initials = box.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const roleBadge = getRoleBadge(box.role);
                  const stats = boxStats[box.id];

                  return (
                    <Link
                      key={box.id}
                      href={`/box/${box.short_id}`}
                      className="group relative rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-4 transition-all hover:border-[#2a2a2a] hover:bg-[#111]"
                    >
                      <div className="flex items-start gap-3">
                        {box.icon_url ? (
                          <img
                            src={box.icon_url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-[8px]"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-white text-[12px] font-bold text-black">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-white">
                            {box.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {roleBadge ? (
                              <span className={`flex items-center gap-1 text-[11px] ${roleBadge.color}`}>
                                <roleBadge.icon className="h-3 w-3" />
                                {roleBadge.label}
                              </span>
                            ) : (
                              <span className="text-[11px] capitalize text-[#555]">
                                {box.role}
                              </span>
                            )}
                            <span className="text-[10px] text-[#333]">·</span>
                            <span className="rounded bg-[#1a1a1a] px-1 py-0.5 text-[9px] font-medium uppercase text-[#555]">
                              {box.plan}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-3 flex gap-3 border-t border-[#151515] pt-3">
                        <span className="flex items-center gap-1 text-[11px] text-[#555]">
                          <Hash className="h-3 w-3" />
                          {stats?.channels ?? 0} channel{stats?.channels !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#555]">
                          <Users className="h-3 w-3" />
                          {stats?.members ?? 0} member{stats?.members !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <ArrowRight className="absolute right-4 top-4 h-3.5 w-3.5 text-[#222] transition-all group-hover:translate-x-0.5 group-hover:text-[#555]" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
