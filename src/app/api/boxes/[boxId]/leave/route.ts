import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  const { boxId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("box_members")
    .select("id, role")
    .eq("box_id", boxId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 404 });
  }

  if (membership.role === "owner" || membership.role === "admin") {
    return NextResponse.json(
      {
        error:
          membership.role === "owner"
            ? "Owners cannot leave their Box. Transfer ownership or delete the Box instead."
            : "Admins cannot leave. Ask the owner to remove your admin role first.",
      },
      { status: 403 }
    );
  }

  // Remove from all private channel memberships in this box
  const { data: boxChannels } = await supabase
    .from("channels")
    .select("id")
    .eq("box_id", boxId)
    .eq("is_private", true);

  if (boxChannels && boxChannels.length > 0) {
    await supabase
      .from("channel_members")
      .delete()
      .in(
        "channel_id",
        boxChannels.map((c) => c.id)
      )
      .eq("user_id", user.id);
  }

  // Remove box membership
  const { error } = await supabase
    .from("box_members")
    .delete()
    .eq("id", membership.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
