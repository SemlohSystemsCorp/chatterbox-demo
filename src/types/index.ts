export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: "online" | "away" | "dnd" | "offline";
  status_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Box {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  owner_id: string;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
  updated_at: string;
}

export interface BoxMember {
  id: string;
  box_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "guest";
  joined_at: string;
  user?: User;
}

export interface Channel {
  id: string;
  box_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JointChannel {
  id: string;
  name: string;
  description: string | null;
  created_by_box_id: string;
  created_at: string;
  updated_at: string;
  boxes: string[];
}

export interface Message {
  id: string;
  channel_id: string | null;
  conversation_id: string | null;
  joint_channel_id: string | null;
  sender_id: string;
  content: string;
  edited_at: string | null;
  parent_message_id: string | null;
  attachments: Attachment[];
  reactions: Reaction[];
  created_at: string;
  sender?: User;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  last_message?: Message;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface Invite {
  id: string;
  box_id: string;
  code: string;
  created_by: string;
  email: string | null;
  role: "admin" | "member" | "guest";
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  created_at: string;
}

export interface Call {
  id: string;
  room_name: string;
  room_url: string;
  channel_id: string | null;
  conversation_id: string | null;
  started_by: string;
  started_at: string;
  ended_at: string | null;
  participants: CallParticipant[];
}

export interface CallParticipant {
  id: string;
  call_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  user?: User;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  box_id: string | null;
  channel_id: string | null;
  mute_all: boolean;
  mute_at_mentions: boolean;
  mute_dms: boolean;
  mute_threads: boolean;
  schedule_enabled: boolean;
  schedule_start: string | null;
  schedule_end: string | null;
  schedule_timezone: string | null;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: "light" | "dark" | "system";
  compact_mode: boolean;
  send_on_enter: boolean;
  show_link_previews: boolean;
  language: string;
  timezone: string;
}

export interface PinnedMessage {
  id: string;
  message_id: string;
  channel_id: string | null;
  conversation_id: string | null;
  pinned_by: string;
  pinned_at: string;
  message?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    sender: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    } | null;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: "mention" | "dm" | "reply" | "reaction" | "invite" | "pin";
  title: string;
  body: string | null;
  box_id: string | null;
  channel_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  actor_id: string | null;
  actor?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  read: boolean;
  email_sent: boolean;
  created_at: string;
}
