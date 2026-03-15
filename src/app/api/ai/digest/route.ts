import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchChannelMessages, formatMessagesForClaude } from "@/lib/ai-utils";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel_id, period, since: sinceDateParam } = await request.json();

  if (!channel_id) {
    return NextResponse.json(
      { error: "channel_id is required" },
      { status: 400 }
    );
  }

  const validPeriod = period === "weekly" ? "weekly" : "daily";
  const since = sinceDateParam
    ? sinceDateParam
    : new Date(Date.now() - (validPeriod === "weekly" ? 7 * 24 : 24) * 60 * 60 * 1000).toISOString();

  const messages = await fetchChannelMessages(supabase, channel_id, {
    limit: 200,
    since,
  });

  if (messages.length === 0) {
    return NextResponse.json({
      digest: null,
      message_count: 0,
      period: validPeriod,
      generated_at: new Date().toISOString(),
    });
  }

  const context = formatMessagesForClaude(messages);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: sinceDateParam
      ? `You are helping a user catch up on messages they missed in a chat channel. Summarize what happened while they were away. Organize by topic or thread. For each topic: give a short title, list key points, name participants, and note any decisions or action items. Include a brief overall summary at the top. Keep it concise but comprehensive. Use markdown formatting with headers and bullet points. Do not add any preamble.`
      : `You are summarizing a chat channel's ${validPeriod} activity. Organize by topic or thread. For each topic: give a short title, list key points, name participants, and note any decisions or action items. Include a brief overall summary at the top. Use markdown formatting with headers and bullet points. Do not add any preamble.`,
    messages: [{ role: "user", content: context }],
  });

  const digest =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({
    digest,
    message_count: messages.length,
    period: validPeriod,
    generated_at: new Date().toISOString(),
  });
}
