import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch recent unread notifications (up to 50)
  const { data: notifications } = await supabase
    .from("notifications")
    .select(
      "id, type, title, body, created_at, read, box_id, channel_id, actor_id, profiles:actor_id(full_name, email)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!notifications || notifications.length === 0) {
    return NextResponse.json({
      summary: "You have no notifications to summarize.",
    });
  }

  // Format notifications for Claude
  const formatted = notifications
    .map((n) => {
      const actor = n.profiles as unknown as {
        full_name: string;
        email: string;
      } | null;
      const who = actor?.full_name || actor?.email || "Someone";
      const time = new Date(n.created_at).toLocaleString();
      const unread = n.read ? "" : " [UNREAD]";
      return `${unread} [${time}] ${n.type.toUpperCase()}: ${n.title}${n.body ? ` — "${n.body}"` : ""} (from ${who})`;
    })
    .join("\n");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalCount = notifications.length;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: `You are a notification summarizer for Chatterbox, a team communication app. Summarize the user's recent notifications in a concise, scannable way. Group related notifications together. Highlight what needs attention (unread items). Use a friendly, brief tone. Keep it under 150 words. Use markdown formatting with bold for names and categories.`,
    messages: [
      {
        role: "user",
        content: `Summarize my ${totalCount} recent notifications (${unreadCount} unread):\n\n${formatted}`,
      },
    ],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ summary: content });
}
