import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const boxId = request.nextUrl.searchParams.get("box_id");

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Build tsquery from user input: split words and join with &
  const tsquery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

  // Search messages the user has access to
  // If boxId is provided, limit to channels in that box
  let query = supabase
    .from("messages")
    .select(
      "id, content, created_at, sender_id, channel_id, conversation_id, profiles:sender_id(id, full_name, email, avatar_url), channels:channel_id(id, short_id, name, box_id, boxes:box_id(short_id, name))"
    )
    .textSearch("content", tsquery)
    .order("created_at", { ascending: false })
    .limit(20);

  if (boxId) {
    // Get channel IDs for this box first
    const { data: boxChannels } = await supabase
      .from("channels")
      .select("id")
      .eq("box_id", boxId);

    if (boxChannels && boxChannels.length > 0) {
      query = query.in(
        "channel_id",
        boxChannels.map((c) => c.id)
      );
    } else {
      return NextResponse.json({ results: [] });
    }
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (messages ?? []).map((m) => {
    const sender = m.profiles as unknown as {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
    const channel = m.channels as unknown as {
      id: string;
      short_id: string;
      name: string;
      box_id: string;
      boxes: { short_id: string; name: string };
    } | null;

    return {
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      sender_id: m.sender_id,
      sender_name: sender?.full_name || sender?.email || "Unknown",
      sender_avatar_url: sender?.avatar_url ?? null,
      channel_id: m.channel_id,
      conversation_id: m.conversation_id,
      channel_name: channel?.name ?? null,
      channel_short_id: channel?.short_id ?? null,
      box_short_id: channel?.boxes?.short_id ?? null,
      box_name: channel?.boxes?.name ?? null,
    };
  });

  return NextResponse.json({ results });
}
