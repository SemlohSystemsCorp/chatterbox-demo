import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is the sole owner of any box
  const { data: ownedBoxes } = await supabase
    .from("box_members")
    .select("box_id")
    .eq("user_id", user.id)
    .eq("role", "owner");

  if (ownedBoxes && ownedBoxes.length > 0) {
    // Check if any of these boxes have other owners
    for (const ob of ownedBoxes) {
      const { count } = await supabase
        .from("box_members")
        .select("id", { count: "exact", head: true })
        .eq("box_id", ob.box_id)
        .eq("role", "owner")
        .neq("user_id", user.id);

      if (!count || count === 0) {
        return NextResponse.json(
          {
            error:
              "You are the sole owner of a Box. Transfer ownership or delete the Box before deleting your account.",
          },
          { status: 400 }
        );
      }
    }
  }

  // Remove user from all boxes
  await supabase
    .from("box_members")
    .delete()
    .eq("user_id", user.id);

  // Remove user from all conversations
  await supabase
    .from("conversation_participants")
    .delete()
    .eq("user_id", user.id);

  // Delete the user's profile (messages remain with sender_id set null via ON DELETE SET NULL)
  await supabase
    .from("profiles")
    .delete()
    .eq("id", user.id);

  // Delete the auth user
  const { error } = await supabase.auth.admin.deleteUser(user.id);

  if (error) {
    // If admin delete fails, try signing out at minimum
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Account data removed but auth deletion failed. Contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
