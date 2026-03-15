import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const TONE_PROMPTS: Record<string, string> = {
  formal:
    "Rewrite this message in a more formal, professional tone. Keep the same meaning.",
  casual:
    "Rewrite this message in a casual, relaxed tone. Keep the same meaning.",
  shorter:
    "Make this message shorter and more concise while keeping the key points.",
  friendlier:
    "Rewrite this message to sound warmer and friendlier. Keep the same meaning.",
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, tone } = await request.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const tonePrompt = TONE_PROMPTS[tone];
  if (!tonePrompt) {
    return NextResponse.json(
      { error: "Invalid tone. Use: formal, casual, shorter, friendlier" },
      { status: 400 }
    );
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system:
      "You rewrite chat messages. Return ONLY the rewritten message, nothing else. No quotes, no explanation.",
    messages: [
      {
        role: "user",
        content: `${tonePrompt}\n\nOriginal message:\n${text.trim()}`,
      },
    ],
  });

  const rewritten =
    response.content[0].type === "text" ? response.content[0].text : text;

  return NextResponse.json({ rewritten });
}
