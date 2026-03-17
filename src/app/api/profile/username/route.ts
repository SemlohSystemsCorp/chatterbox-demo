import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const USERNAME_RE = /^[a-zA-Z0-9._-]{2,30}$/;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await request.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const cleaned = username.trim().toLowerCase();

  if (!USERNAME_RE.test(cleaned)) {
    return NextResponse.json(
      { error: "Username must be 2-30 characters and can only contain letters, numbers, dots, hyphens, and underscores" },
      { status: 400 }
    );
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", cleaned)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: cleaned })
    .eq("id", user.id);

  if (error) {
    // Handle unique constraint violation (race condition: someone took it between check and update)
    if (error.code === "23505") {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
  }

  return NextResponse.json({ username: cleaned });
}
