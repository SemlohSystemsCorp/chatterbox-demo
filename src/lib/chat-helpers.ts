// ── Chat UI helper functions ──
// Shared between channel-page-client and dm-page-client

export function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function shouldShowDate(current: string, previous: string | null) {
  if (!previous) return true;
  return (
    new Date(current).toDateString() !== new Date(previous).toDateString()
  );
}

export function getInitials(name: string, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export interface MessageData {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  sender_id: string;
  parent_message_id: string | null;
  reactions: ReactionData[];
  sender: SenderData;
}

export interface SenderData {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  username?: string;
}

export interface ReactionData {
  emoji: string;
  user_id: string;
}

export function isGrouped(current: MessageData, previous: MessageData | null) {
  if (!previous) return false;
  if (current.sender_id !== previous.sender_id) return false;
  const diff =
    new Date(current.created_at).getTime() -
    new Date(previous.created_at).getTime();
  return diff < 5 * 60 * 1000;
}

export interface BoxData {
  id: string;
  short_id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  plan: string;
  role: string;
}

export interface SidebarChannel {
  id: string;
  short_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface MemberData {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  username: string;
}

export interface ReadCursor {
  user_id: string;
  last_read_at: string;
}

export interface UserData {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  username: string;
}
