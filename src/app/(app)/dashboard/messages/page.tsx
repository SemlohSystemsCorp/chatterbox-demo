import type { Metadata } from "next";
import { getAuthUser, getUserConversations } from "@/lib/data";
import { MessagesClient } from "./messages-client";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function MessagesPage() {
  const { supabase, user } = await getAuthUser();
  const conversations = await getUserConversations(supabase, user.id);

  return (
    <MessagesClient
      user={user}
      conversations={conversations.map((c) => ({
        id: c.id,
        short_id: c.short_id,
        is_group: c.is_group,
        name: c.name,
        updated_at: c.updated_at,
        participants: c.participants,
      }))}
    />
  );
}
