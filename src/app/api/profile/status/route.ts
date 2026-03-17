import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { status_text, status_emoji, status_expires_at, channel_id, sender_name } = body as {
    status_text?: string | null;
    status_emoji?: string | null;
    status_expires_at?: string | null;
    channel_id?: string;
    sender_name?: string;
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      status_text: status_text ?? null,
      status_emoji: status_emoji ?? null,
      status_expires_at: status_expires_at ?? null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If channel_id provided, insert a system message announcing the status change
  if (channel_id && status_text) {
    const systemContent = `__system:${JSON.stringify({
      type: "status_update",
      user_name: sender_name || "Someone",
      status_emoji: status_emoji || null,
      status_text: status_text,
    })}`;

    await supabase.from("messages").insert({
      channel_id,
      sender_id: user.id,
      content: systemContent,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      status_text: null,
      status_emoji: null,
      status_expires_at: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
