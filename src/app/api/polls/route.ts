import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question, options, channel_id, conversation_id, allows_multiple, is_anonymous, expires_in_minutes } = body as {
    question: string;
    options: string[];
    channel_id?: string;
    conversation_id?: string;
    allows_multiple?: boolean;
    is_anonymous?: boolean;
    expires_in_minutes?: number;
  };

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  if (!options || options.length < 2) {
    return NextResponse.json({ error: "At least 2 options required" }, { status: 400 });
  }
  if (options.length > 10) {
    return NextResponse.json({ error: "Maximum 10 options" }, { status: 400 });
  }
  if (!channel_id && !conversation_id) {
    return NextResponse.json({ error: "channel_id or conversation_id required" }, { status: 400 });
  }

  const expiresAt = expires_in_minutes
    ? new Date(Date.now() + expires_in_minutes * 60 * 1000).toISOString()
    : null;

  // Create the poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      channel_id: channel_id || null,
      conversation_id: conversation_id || null,
      creator_id: user.id,
      question: question.trim(),
      allows_multiple: allows_multiple ?? false,
      is_anonymous: is_anonymous ?? false,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (pollError) {
    return NextResponse.json({ error: pollError.message }, { status: 500 });
  }

  // Insert options
  const optionRows = options
    .filter((o: string) => o.trim())
    .map((label: string, i: number) => ({
      poll_id: poll.id,
      label: label.trim(),
      position: i,
    }));

  const { error: optError } = await supabase.from("poll_options").insert(optionRows);

  if (optError) {
    // Clean up poll
    await supabase.from("polls").delete().eq("id", poll.id);
    return NextResponse.json({ error: optError.message }, { status: 500 });
  }

  // Insert a system message referencing the poll
  const target = channel_id
    ? { channel_id }
    : { conversation_id };

  const systemContent = `__system:${JSON.stringify({
    type: "poll",
    poll_id: poll.id,
    question: question.trim(),
  })}`;

  await supabase.from("messages").insert({
    ...target,
    sender_id: user.id,
    content: systemContent,
  });

  return NextResponse.json({ poll_id: poll.id });
}
