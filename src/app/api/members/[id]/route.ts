import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the member record to know which box
  const { data: member } = await supabase
    .from("box_members")
    .select("id, box_id, user_id, role")
    .eq("id", memberId)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Verify the requester is an owner of this box
  const { data: requester } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", member.box_id)
    .eq("user_id", user.id)
    .single();

  if (!requester || requester.role !== "owner") {
    return NextResponse.json(
      { error: "Only box owners can remove members" },
      { status: 403 }
    );
  }

  // Cannot remove yourself
  if (member.user_id === user.id) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 }
    );
  }

  // Cannot remove other owners
  if (member.role === "owner") {
    return NextResponse.json(
      { error: "Cannot remove another owner" },
      { status: 400 }
    );
  }

  // Remove the member
  const { error } = await supabase
    .from("box_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
