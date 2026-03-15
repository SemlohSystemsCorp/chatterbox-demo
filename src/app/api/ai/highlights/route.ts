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

  const { channel_id, since } = await request.json();

  if (!channel_id || !since) {
    return NextResponse.json(
      { error: "channel_id and since are required" },
      { status: 400 }
    );
  }

  const messages = await fetchChannelMessages(supabase, channel_id, {
    limit: 100,
    since,
  });

  if (messages.length < 5) {
    return NextResponse.json({ highlights: null, total_unread: messages.length });
  }

  const context = formatMessagesForClaude(messages);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: `Analyze these unread chat messages and identify the most important items. Categorize each into one of: DECISION, ACTION_ITEM, QUESTION, MENTION, IMPORTANT.

Return a JSON array (and nothing else) where each item has:
- "category": one of the categories above
- "summary": a brief one-sentence summary
- "sender_name": who said it

Return at most 8 items, prioritizing decisions and action items. Return ONLY valid JSON, no markdown fences.`,
    messages: [{ role: "user", content: context }],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "[]";

  let highlights;
  try {
    highlights = JSON.parse(raw);
  } catch {
    highlights = [];
  }

  return NextResponse.json({
    highlights,
    total_unread: messages.length,
  });
}
