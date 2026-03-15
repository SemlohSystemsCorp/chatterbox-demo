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
  const { message_id, emoji } = body;

  if (!message_id || !emoji) {
    return NextResponse.json(
      { error: "message_id and emoji are required" },
      { status: 400 }
    );
  }

  // Check if reaction already exists (toggle off)
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("message_id", message_id)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  const { error } = await supabase.from("reactions").insert({
    message_id,
    user_id: user.id,
    emoji,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ action: "added" }, { status: 201 });
}
