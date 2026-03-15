import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// GET — list members of a private channel
export async function GET(
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

  const { data: channel } = await supabase
    .from("channels")
    .select("id, box_id, is_private")
    .eq("id", channelId)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Verify box membership
  const { data: boxMembership } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", channel.box_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!boxMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!channel.is_private) {
    return NextResponse.json({ members: [], is_private: false });
  }

  const { data: members } = await supabase
    .from("channel_members")
    .select("id, user_id, added_at, profiles:user_id(id, full_name, email, avatar_url, username)")
    .eq("channel_id", channelId)
    .order("added_at", { ascending: true });

  const result = (members ?? []).map((m) => {
    const profile = m.profiles as unknown as {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
      username: string;
    };
    return {
      id: m.id,
      user_id: m.user_id,
      added_at: m.added_at,
      full_name: profile.full_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      username: profile.username || profile.email.split("@")[0],
    };
  });

  return NextResponse.json({ members: result, is_private: true });
}

// POST — add members to a private channel
export async function POST(
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

  const body = await request.json();
  const { user_ids } = body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: "user_ids required" }, { status: 400 });
  }

  // Get channel
  const { data: channel } = await supabase
    .from("channels")
    .select("id, box_id, is_private")
    .eq("id", channelId)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (!channel.is_private) {
    return NextResponse.json(
      { error: "Channel is not private — all box members have access" },
      { status: 400 }
    );
  }

  // Verify caller is admin/owner of the box, or already a channel member
  const { data: boxMembership } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", channel.box_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!boxMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isBoxAdmin = ["owner", "admin"].includes(boxMembership.role);

  if (!isBoxAdmin) {
    // Check if caller is a channel member
    const { data: callerMembership } = await supabase
      .from("channel_members")
      .select("id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!callerMembership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Verify all target users are box members
  const { data: targetBoxMembers } = await supabase
    .from("box_members")
    .select("user_id")
    .eq("box_id", channel.box_id)
    .in("user_id", user_ids);

  const validUserIds = (targetBoxMembers ?? []).map((m) => m.user_id);

  if (validUserIds.length === 0) {
    return NextResponse.json(
      { error: "None of the specified users are box members" },
      { status: 400 }
    );
  }

  // Insert (upsert to handle duplicates gracefully)
  const rows = validUserIds.map((uid) => ({
    channel_id: channelId,
    user_id: uid,
    added_by: user.id,
  }));

  const { error } = await supabase
    .from("channel_members")
    .upsert(rows, { onConflict: "channel_id,user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ added: validUserIds.length });
}

// DELETE — remove a member from a private channel
export async function DELETE(
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

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("user_id");

  if (!targetUserId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  // Get channel
  const { data: channel } = await supabase
    .from("channels")
    .select("id, box_id")
    .eq("id", channelId)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Check caller's box role
  const { data: callerBoxRole } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", channel.box_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerBoxRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isSelf = targetUserId === user.id;
  const isCallerAdmin = ["owner", "admin"].includes(callerBoxRole.role);

  // Admins/owners can't leave private channels (they always have access)
  if (isSelf && isCallerAdmin) {
    return NextResponse.json(
      { error: "Admins and owners always have access to private channels and cannot leave them." },
      { status: 403 }
    );
  }

  // Non-admins can only remove themselves
  if (!isSelf && !isCallerAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("channel_members")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
