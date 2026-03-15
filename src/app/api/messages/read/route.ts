import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channel_id, conversation_id, timestamp } = body;

  // Validate: exactly one target + timestamp required
  const hasChannel = typeof channel_id === "string" && channel_id.length > 0;
  const hasConversation =
    typeof conversation_id === "string" && conversation_id.length > 0;

  if ((!hasChannel && !hasConversation) || (hasChannel && hasConversation)) {
    return NextResponse.json(
      { error: "Provide exactly one of channel_id or conversation_id" },
      { status: 400 }
    );
  }

  if (!timestamp || typeof timestamp !== "string") {
    return NextResponse.json(
      { error: "timestamp is required" },
      { status: 400 }
    );
  }

  // Check if user allows read receipts
  const { data: settings } = await supabase
    .from("user_settings")
    .select("allow_read_receipts")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settings && !settings.allow_read_receipts) {
    // User opted out — silently skip
    return NextResponse.json({ ok: true });
  }

  // Only advance cursor forward
  const targetColumn = hasChannel ? "channel_id" : "conversation_id";
  const targetId = hasChannel ? channel_id : conversation_id;

  const { data: existing } = await supabase
    .from("read_cursors")
    .select("last_read_at")
    .eq("user_id", user.id)
    .eq(targetColumn, targetId)
    .maybeSingle();

  if (existing && new Date(existing.last_read_at) >= new Date(timestamp)) {
    return NextResponse.json({ ok: true });
  }

  // Validate timestamp format
  if (isNaN(new Date(timestamp).getTime())) {
    return NextResponse.json(
      { error: "Invalid timestamp format" },
      { status: 400 }
    );
  }

  // Insert or update — can't use upsert because NULL ≠ NULL in Postgres
  // unique constraints, which causes duplicates when the other column is null
  let error;
  if (existing) {
    ({ error } = await supabase
      .from("read_cursors")
      .update({ last_read_at: timestamp })
      .eq("user_id", user.id)
      .eq(targetColumn, targetId));
  } else {
    ({ error } = await supabase.from("read_cursors").insert({
      user_id: user.id,
      ...(hasChannel
        ? { channel_id, conversation_id: null }
        : { channel_id: null, conversation_id }),
      last_read_at: timestamp,
    }));

    // Race condition: another request inserted first — retry as update
    if (error && error.code === "23505") {
      ({ error } = await supabase
        .from("read_cursors")
        .update({ last_read_at: timestamp })
        .eq("user_id", user.id)
        .eq(targetColumn, targetId));
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
