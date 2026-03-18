import { createClient } from "@/lib/supabase/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { inviteEmail } from "@/lib/email-templates";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { box_id, emails } = body;

  if (!box_id || typeof box_id !== "string") {
    return NextResponse.json({ error: "box_id is required" }, { status: 400 });
  }

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json(
      { error: "At least one email is required" },
      { status: 400 }
    );
  }

  if (emails.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 invites at once" },
      { status: 400 }
    );
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
      { error: "Only admins can send invites" },
      { status: 403 }
    );
  }

  // Get box info for the email
  const { data: box } = await supabase
    .from("boxes")
    .select("name, slug")
    .eq("id", box_id)
    .single();

  if (!box) {
    return NextResponse.json({ error: "Box not found" }, { status: 404 });
  }

  // Get inviter profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const inviterName = profile?.full_name || profile?.email || "Someone";

  const expires_at = new Date(
    Date.now() + 7 * 24 * 3600000
  ).toISOString(); // 7 days

  // Send emails — create one invite per email with the email stored
  const results: { email: string; success: boolean }[] = [];

  for (const email of emails) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      results.push({ email: trimmed, success: false });
      continue;
    }

    const code = crypto.randomBytes(4).toString("hex");

    const { error: inviteError } = await supabase.from("invites").insert({
      box_id,
      code,
      created_by: user.id,
      email: trimmed,
      role: "member",
      expires_at,
    });

    if (inviteError) {
      results.push({ email: trimmed, success: false });
      continue;
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://getchatterbox.app"}/invite/${code}`;

    try {
      await resend.emails.send({
        from: `Chatterbox <${FROM_EMAIL}>`,
        to: trimmed,
        subject: `${inviterName} invited you to ${box.name} on Chatterbox`,
        html: inviteEmail(inviterName, box.name, inviteUrl),
      });
      results.push({ email: trimmed, success: true });
    } catch {
      results.push({ email: trimmed, success: false });
    }
  }

  const sent = results.filter((r) => r.success).length;

  return NextResponse.json({ sent, total: results.length, results });
}
