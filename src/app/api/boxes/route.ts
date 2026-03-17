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
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (name.trim().length > 50) {
    return NextResponse.json(
      { error: "Name must be under 50 characters" },
      { status: 400 }
    );
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Check for slug uniqueness
  const { data: existing } = await supabase
    .from("boxes")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .insert({
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || null,
      owner_id: user.id,
    })
    .select()
    .single();

  if (boxError) {
    return NextResponse.json({ error: boxError.message }, { status: 500 });
  }

  // Add the creator as owner
  const { error: memberError } = await supabase.from("box_members").insert({
    box_id: box.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    // Rollback: delete the box if we can't add the member
    await supabase.from("boxes").delete().eq("id", box.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Create a default #general channel
  const { error: channelError } = await supabase.from("channels").insert({
    box_id: box.id,
    name: "general",
    description: "General discussion",
    created_by: user.id,
  });

  if (channelError) {
    // Rollback: delete member and box
    await supabase.from("box_members").delete().eq("box_id", box.id);
    await supabase.from("boxes").delete().eq("id", box.id);
    return NextResponse.json({ error: "Failed to create default channel" }, { status: 500 });
  }

  return NextResponse.json({ box }, { status: 201 });
}
