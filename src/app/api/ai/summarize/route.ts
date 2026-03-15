import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  fetchChannelMessages,
  fetchThreadMessages,
  formatMessagesForClaude,
} from "@/lib/ai-utils";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel_id, thread_parent_id, message_count } =
    await request.json();

  if (!channel_id && !thread_parent_id) {
    return NextResponse.json(
      { error: "Provide channel_id or thread_parent_id" },
      { status: 400 }
    );
  }

  const messages = thread_parent_id
    ? await fetchThreadMessages(supabase, thread_parent_id)
    : await fetchChannelMessages(supabase, channel_id, {
        limit: message_count ?? 50,
      });

  if (messages.length === 0) {
    return NextResponse.json({
      summary: "No messages to summarize.",
      message_count: 0,
      time_range: null,
    });
  }

  const context = formatMessagesForClaude(messages);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system:
      "Summarize this conversation concisely. Highlight key decisions, action items, and important topics. Use bullet points. Mention people by name when relevant. Do not add any preamble.",
    messages: [
      { role: "user", content: context },
    ],
  });

  const summary =
    response.content[0].type === "text" ? response.content[0].text : "";

  const sorted = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return NextResponse.json({
    summary,
    message_count: messages.length,
    time_range: {
      from: sorted[0].created_at,
      to: sorted[sorted.length - 1].created_at,
    },
  });
}
