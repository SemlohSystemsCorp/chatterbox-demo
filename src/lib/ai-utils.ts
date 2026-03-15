import { createClient } from "@/lib/supabase/server";

export interface ContextMessage {
  id: string;
  content: string;
  created_at: string;
  sender_name: string;
  channel_name: string | null;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function fetchChannelMessages(
  supabase: SupabaseClient,
  channelId: string,
  opts: { limit?: number; since?: string } = {}
) {
  let query = supabase
    .from("messages")
    .select(
      "id, content, created_at, sender_id, parent_message_id, profiles:sender_id(full_name, email), channels:channel_id(name)"
    )
    .eq("channel_id", channelId)
    .is("parent_message_id", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.since) {
    query = query.gt("created_at", opts.since);
  }

  const { data } = await query;
  return mapMessages(data);
}

export async function fetchThreadMessages(
  supabase: SupabaseClient,
  parentMessageId: string
) {
  // Fetch parent + all replies
  const { data: parent } = await supabase
    .from("messages")
    .select(
      "id, content, created_at, sender_id, parent_message_id, profiles:sender_id(full_name, email), channels:channel_id(name)"
    )
    .eq("id", parentMessageId)
    .single();

  const { data: replies } = await supabase
    .from("messages")
    .select(
      "id, content, created_at, sender_id, parent_message_id, profiles:sender_id(full_name, email), channels:channel_id(name)"
    )
    .eq("parent_message_id", parentMessageId)
    .order("created_at", { ascending: true });

  const all = parent ? [parent, ...(replies ?? [])] : (replies ?? []);
  return mapMessages(all);
}

export async function fetchBoxChannelIds(
  supabase: SupabaseClient,
  boxId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("channels")
    .select("id")
    .eq("box_id", boxId);
  return (data ?? []).map((c) => c.id);
}

function mapMessages(data: unknown[] | null): ContextMessage[] {
  return (data ?? []).map((m: unknown) => {
    const msg = m as {
      id: string;
      content: string;
      created_at: string;
      profiles: { full_name: string; email: string } | null;
      channels: { name: string } | null;
    };
    return {
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      sender_name:
        msg.profiles?.full_name || msg.profiles?.email || "Unknown",
      channel_name: msg.channels?.name ?? null,
    };
  });
}

export function formatMessagesForClaude(messages: ContextMessage[]): string {
  const sorted = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return sorted
    .map((m) => {
      const date = new Date(m.created_at).toLocaleString();
      const where = m.channel_name ? ` in #${m.channel_name}` : "";
      return `[${date}${where}] ${m.sender_name}: ${m.content}`;
    })
    .join("\n");
}
