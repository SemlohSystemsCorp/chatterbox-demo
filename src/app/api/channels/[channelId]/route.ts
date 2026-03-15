import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get channel to find box_id
  const { data: channel } = await supabase
    .from("channels")
    .select("id, box_id, name")
    .eq("id", channelId)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Verify admin/owner of the box
  const { data: membership } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", channel.box_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null;
  }

  if (body.is_private !== undefined) {
    updates.is_private = Boolean(body.is_private);
  }

  if (body.is_archived !== undefined) {
    updates.is_archived = Boolean(body.is_archived);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("channels")
    .update(updates)
    .eq("id", channelId)
    .select("id, short_id, name, description, is_private, is_archived, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A channel with that name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ channel: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get channel to find box_id
  const { data: channel } = await supabase
    .from("channels")
    .select("id, box_id")
    .eq("id", channelId)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Verify admin/owner
  const { data: membership } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", channel.box_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("channels").delete().eq("id", channelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
