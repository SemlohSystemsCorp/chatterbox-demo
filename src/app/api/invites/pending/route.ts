import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Use service role to bypass RLS — the user isn't a member of these boxes yet
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find invites where email matches and invite is still valid
  const { data: invites } = await admin
    .from("invites")
    .select("code, role, box_id, created_by, expires_at, max_uses, uses")
    .eq("email", email.toLowerCase())
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (!invites || invites.length === 0) {
    return NextResponse.json({ invites: [] });
  }

  // Filter out invites that have hit max uses
  const validInvites = invites.filter(
    (inv) => inv.max_uses === null || inv.uses < inv.max_uses
  );

  if (validInvites.length === 0) {
    return NextResponse.json({ invites: [] });
  }

  // Check which boxes the user is already a member of
  const boxIds = [...new Set(validInvites.map((inv) => inv.box_id))];

  const { data: existingMemberships } = await admin
    .from("box_members")
    .select("box_id")
    .eq("user_id", user.id)
    .in("box_id", boxIds);

  const memberBoxIds = new Set((existingMemberships ?? []).map((m) => m.box_id));

  // Filter out boxes user already belongs to
  const newInvites = validInvites.filter((inv) => !memberBoxIds.has(inv.box_id));

  if (newInvites.length === 0) {
    return NextResponse.json({ invites: [] });
  }

  const newBoxIds = [...new Set(newInvites.map((inv) => inv.box_id))];

  const [boxesResult, memberCountsResult, invitersResult] = await Promise.all([
    admin
      .from("boxes")
      .select("id, name, icon_url")
      .in("id", newBoxIds),
    admin
      .from("box_members")
      .select("box_id")
      .in("box_id", newBoxIds),
    admin
      .from("profiles")
      .select("id, full_name")
      .in(
        "id",
        [...new Set(newInvites.map((inv) => inv.created_by))]
      ),
  ]);

  const boxMap = new Map(
    (boxesResult.data ?? []).map((b) => [b.id, b])
  );
  const inviterMap = new Map(
    (invitersResult.data ?? []).map((p) => [p.id, p.full_name])
  );

  // Count members per box
  const memberCounts: Record<string, number> = {};
  for (const row of memberCountsResult.data ?? []) {
    memberCounts[row.box_id] = (memberCounts[row.box_id] ?? 0) + 1;
  }

  const result = newInvites.map((inv) => {
    const box = boxMap.get(inv.box_id);
    return {
      code: inv.code,
      box_name: box?.name ?? "Unknown",
      box_icon_url: box?.icon_url ?? null,
      role: inv.role,
      inviter_name: inviterMap.get(inv.created_by) ?? null,
      member_count: memberCounts[inv.box_id] ?? 0,
    };
  });

  return NextResponse.json({ invites: result });
}
