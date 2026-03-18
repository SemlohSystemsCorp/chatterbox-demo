"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon as ArrowLeft, TrophyIcon as Crown, ShieldIcon as Shield, SearchIcon as Search, PersonAddIcon as UserPlus } from "@primer/octicons-react";
import { AppShell } from "@/components/layout/app-shell";
import { InviteModal } from "@/components/modals/invite-modal";

interface BoxData {
  id: string;
  short_id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  plan: string;
  role: string;
}

interface MemberData {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
}

interface MembersPageClientProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  boxes: BoxData[];
  box: BoxData & { description: string | null };
  members: MemberData[];
}

function getRoleIcon(role: string) {
  if (role === "owner") return Crown;
  if (role === "admin") return Shield;
  return null;
}

export function MembersPageClient({
  user,
  boxes,
  box,
  members,
}: MembersPageClientProps) {
  const isAdmin = box.role === "owner" || box.role === "admin";
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = search.trim()
    ? members.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  // Sort: online first, then by role (owner > admin > member > guest)
  const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2, guest: 3 };
  const statusOrder: Record<string, number> = { online: 0, away: 1, dnd: 2, offline: 3 };
  const sorted = [...filtered].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    if (statusDiff !== 0) return statusDiff;
    return (roleOrder[a.role] ?? 4) - (roleOrder[b.role] ?? 4);
  });

  const onlineCount = members.filter((m) => m.status === "online").length;

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
          <span className="text-[15px] font-semibold text-white">Members</span>
          <span className="text-[13px] text-[#555]">({members.length})</span>
          {onlineCount > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-[#555]">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {onlineCount} online
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[720px] px-6 py-6">
          {/* Search + Invite */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-[#1a1a1a] bg-[#0f0f0f] pl-9 pr-3 text-[13px] text-white placeholder:text-[#444] focus:border-[#333] focus:outline-none"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => setInviteOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-[8px] bg-white px-3 text-[13px] font-medium text-black transition-colors hover:bg-[#ddd]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Invite
              </button>
            )}
          </div>

          {/* Member list */}
          {sorted.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#222] py-10 text-center">
              <p className="text-[13px] text-[#666]">No members match your search</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sorted.map((member) => {
                const RoleIcon = getRoleIcon(member.role);
                const initials = member.full_name
                  ? member.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : member.email[0].toUpperCase();

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-[10px] border border-[#1a1a1a] bg-[#0f0f0f] px-4 py-3"
                  >
                    <div className="relative">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                          {initials}
                        </div>
                      )}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f0f0f] ${
                          member.status === "online"
                            ? "bg-green-500"
                            : member.status === "away"
                              ? "bg-yellow-500"
                              : member.status === "dnd"
                                ? "bg-red-500"
                                : "bg-[#555]"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-medium text-white">
                          {member.full_name || member.email}
                        </span>
                        {member.user_id === user.id && (
                          <span className="text-[11px] text-[#555]">(you)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#555]">
                        {member.full_name && (
                          <span className="truncate">{member.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] capitalize text-[#555]">
                      {RoleIcon && <RoleIcon className="h-3 w-3" />}
                      {member.role}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        boxId={box.id}
        boxName={box.name}
      />
    </AppShell>
  );
}
