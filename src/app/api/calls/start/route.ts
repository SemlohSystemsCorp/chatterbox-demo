import { createClient } from "@/lib/supabase/server";
import { createDailyRoom, createMeetingToken } from "@/lib/daily";
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
  const { channel_id, conversation_id } = body;

  if (!channel_id && !conversation_id) {
    return NextResponse.json(
      { error: "channel_id or conversation_id required" },
      { status: 400 }
    );
  }

  // Get user's display name for the system message
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();
  const callerName = profile?.full_name || profile?.email || "Someone";

  // Check for existing active call
  const query = supabase
    .from("calls")
    .select("id, room_name, room_url")
    .is("ended_at", null);

  if (channel_id) query.eq("channel_id", channel_id);
  else query.eq("conversation_id", conversation_id);

  const { data: existingCall } = await query.maybeSingle();

  if (existingCall) {
    // Join existing call instead of starting a new one
    const { token } = await createMeetingToken(
      existingCall.room_name,
      user.id
    );

    // Add as participant
    await supabase.from("call_participants").insert({
      call_id: existingCall.id,
      user_id: user.id,
    });

    return NextResponse.json({
      call: existingCall,
      token,
      joined_existing: true,
    });
  }

  // Create a new Daily room
  const roomName = `chatterbox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const room = await createDailyRoom({
    name: roomName,
    privacy: "private",
    expiresInMinutes: 120,
  });

  // Get a meeting token
  const { token } = await createMeetingToken(room.name, user.id);

  // Save call to DB
  const { data: call, error: callError } = await supabase
    .from("calls")
    .insert({
      room_name: room.name,
      room_url: room.url,
      channel_id: channel_id || null,
      conversation_id: conversation_id || null,
      started_by: user.id,
    })
    .select("id, room_name, room_url")
    .single();

  if (callError) {
    return NextResponse.json({ error: "Failed to create call" }, { status: 500 });
  }

  // Add caller as first participant
  await supabase.from("call_participants").insert({
    call_id: call.id,
    user_id: user.id,
  });

  // Insert channel event for call started
  if (channel_id) {
    await supabase.from("channel_events").insert({
      channel_id,
      actor_id: user.id,
      type: "call_started",
      metadata: { actor_name: callerName, call_id: call.id },
    });
  }

  return NextResponse.json({ call, token, joined_existing: false }, { status: 201 });
}
