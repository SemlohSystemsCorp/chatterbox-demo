import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// GET /api/messages/schedule?channel_id=xxx or ?conversation_id=xxx — list pending scheduled messages
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = request.nextUrl.searchParams.get("channel_id");
  const conversationId = request.nextUrl.searchParams.get("conversation_id");

  let query = supabase
    .from("scheduled_messages")
    .select("id, content, scheduled_for, status, channel_id, conversation_id, attachments, created_at")
    .eq("sender_id", user.id)
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true });

  if (channelId) {
    query = query.eq("channel_id", channelId);
  } else if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scheduled: data ?? [] });
}

// POST /api/messages/schedule — create a scheduled message
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channel_id, conversation_id, content, scheduled_for, parent_message_id, attachments } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (!scheduled_for) {
    return NextResponse.json({ error: "scheduled_for is required" }, { status: 400 });
  }

  if (!channel_id && !conversation_id) {
    return NextResponse.json({ error: "channel_id or conversation_id is required" }, { status: 400 });
  }

  const scheduledDate = new Date(scheduled_for);
  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scheduled_messages")
    .insert({
      channel_id: channel_id || null,
      conversation_id: conversation_id || null,
      sender_id: user.id,
      content: content.trim(),
      scheduled_for,
      parent_message_id: parent_message_id || null,
      attachments: attachments || [],
    })
    .select("id, scheduled_for, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scheduled: data }, { status: 201 });
}

// DELETE /api/messages/schedule?id=xxx — cancel a scheduled message
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("scheduled_messages")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("sender_id", user.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
