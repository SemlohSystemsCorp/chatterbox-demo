import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

function generateCode() {
  return crypto.randomBytes(4).toString("hex"); // 8-char hex code
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { box_id, role, expires_in_hours, max_uses } = body;

  if (!box_id || typeof box_id !== "string") {
    return NextResponse.json({ error: "box_id is required" }, { status: 400 });
  }

  // Verify user is admin/owner
  const { data: membership } = await supabase
    .from("box_members")
    .select("role")
    .eq("box_id", box_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only admins can create invites" },
      { status: 403 }
    );
  }

  const code = generateCode();
  const expires_at = expires_in_hours
    ? new Date(Date.now() + expires_in_hours * 3600000).toISOString()
    : null;

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      box_id,
      code,
      created_by: user.id,
      role: role || "member",
      expires_at,
      max_uses: max_uses || null,
    })
    .select("id, code, role, expires_at, max_uses, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invite }, { status: 201 });
}
