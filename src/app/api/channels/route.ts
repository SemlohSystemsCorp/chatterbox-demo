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
  const { box_id, name, description, is_private } = body;

  if (!box_id || typeof box_id !== "string") {
    return NextResponse.json({ error: "box_id is required" }, { status: 400 });
  }

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    return NextResponse.json(
      { error: "Channel name is required" },
      { status: 400 }
    );
  }

  if (name.trim().length > 80) {
    return NextResponse.json(
      { error: "Channel name must be under 80 characters" },
      { status: 400 }
    );
  }

  // Sanitize: lowercase, no spaces, alphanumeric + hyphens
  const channelName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!channelName) {
    return NextResponse.json(
      { error: "Invalid channel name" },
      { status: 400 }
    );
  }

  // Verify the user is a member of the box
  const { data: membership } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", box_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this Box" },
      { status: 403 }
    );
  }

  // Create the channel
  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .insert({
      box_id,
      name: channelName,
      description: description?.trim() || null,
      is_private: is_private ?? false,
      created_by: user.id,
    })
    .select("id, short_id, name, description, is_private, created_at")
    .single();

  if (channelError) {
    // Unique constraint violation = channel name already exists
    if (channelError.code === "23505") {
      return NextResponse.json(
        { error: `A channel named #${channelName} already exists in this Box` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: channelError.message },
      { status: 500 }
    );
  }

  // Auto-add creator as member for private channels
  if (is_private && channel) {
    await supabase.from("channel_members").insert({
      channel_id: channel.id,
      user_id: user.id,
      added_by: user.id,
    });
  }

  return NextResponse.json({ channel }, { status: 201 });
}
