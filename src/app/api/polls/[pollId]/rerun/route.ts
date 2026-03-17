import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// POST — re-run an expired poll (create a new one with the same question + options)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get original poll
  const { data: poll } = await supabase
    .from("polls")
    .select("id, question, channel_id, conversation_id, allows_multiple, is_anonymous, creator_id")
    .eq("id", pollId)
    .single();

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (poll.creator_id !== user.id) {
    return NextResponse.json({ error: "Only the poll creator can re-run" }, { status: 403 });
  }

  // Get original options
  const { data: options } = await supabase
    .from("poll_options")
    .select("label, position")
    .eq("poll_id", pollId)
    .order("position");

  if (!options || options.length === 0) {
    return NextResponse.json({ error: "No options found" }, { status: 400 });
  }

  // Parse optional new duration from body
  const body = await request.json().catch(() => ({}));
  const expiresInMinutes = body.expires_in_minutes as number | undefined;
  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()
    : null;

  // Create new poll
  const { data: newPoll, error: pollError } = await supabase
    .from("polls")
    .insert({
      channel_id: poll.channel_id || null,
      conversation_id: poll.conversation_id || null,
      creator_id: user.id,
      question: poll.question,
      allows_multiple: poll.allows_multiple,
      is_anonymous: poll.is_anonymous,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (pollError) {
    return NextResponse.json({ error: pollError.message }, { status: 500 });
  }

  // Insert options
  const { error: optError } = await supabase.from("poll_options").insert(
    options.map((o) => ({
      poll_id: newPoll.id,
      label: o.label,
      position: o.position,
    }))
  );

  if (optError) {
    await supabase.from("polls").delete().eq("id", newPoll.id);
    return NextResponse.json({ error: optError.message }, { status: 500 });
  }

  // Insert system message
  const target = poll.channel_id
    ? { channel_id: poll.channel_id }
    : { conversation_id: poll.conversation_id };

  await supabase.from("messages").insert({
    ...target,
    sender_id: user.id,
    content: `__system:${JSON.stringify({
      type: "poll",
      poll_id: newPoll.id,
      question: poll.question,
    })}`,
  });

  return NextResponse.json({ poll_id: newPoll.id });
}
