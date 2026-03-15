import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// GET /api/notifications — list notifications for current user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";

  let query = supabase
    .from("notifications")
    .select(
      "id, type, title, body, box_id, channel_id, conversation_id, message_id, actor_id, read, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data: notifications, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch actor profiles
  const actorIds = [
    ...new Set(
      (notifications ?? []).map((n) => n.actor_id).filter(Boolean) as string[]
    ),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", actorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Get unread count
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  const enriched = (notifications ?? []).map((n) => ({
    ...n,
    actor: n.actor_id ? profileMap.get(n.actor_id) ?? null : null,
  }));

  return NextResponse.json({
    notifications: enriched,
    unread_count: count ?? 0,
  });
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notification_ids, mark_all } = await request.json();

  if (mark_all) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (notification_ids?.length) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", notification_ids)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
