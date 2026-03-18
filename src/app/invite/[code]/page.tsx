import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { InviteLandingClient } from "./invite-landing-client";

export const metadata: Metadata = {
  title: "You're invited",
  description: "You've been invited to join a Chatterbox workspace.",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // Use service role to look up invite — unauthenticated users can't query via RLS
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite } = await admin
    .from("invites")
    .select(
      "code, role, expires_at, max_uses, uses, created_by, box_id, boxes(id, name, slug, icon_url)"
    )
    .eq("code", code)
    .maybeSingle();

  if (!invite) {
    return <InviteLandingClient error="This invite link is invalid." />;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return <InviteLandingClient error="This invite has expired." />;
  }

  if (invite.max_uses && invite.uses >= invite.max_uses) {
    return (
      <InviteLandingClient error="This invite has reached its maximum uses." />
    );
  }

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/join?code=${code}`);
  }

  // Fetch extra details for the landing page
  const box = invite.boxes as unknown as {
    id: string;
    name: string;
    slug: string;
    icon_url: string | null;
  };

  const [memberCountResult, channelCountResult, inviterResult] =
    await Promise.all([
      admin
        .from("box_members")
        .select("id", { count: "exact", head: true })
        .eq("box_id", invite.box_id),
      admin
        .from("channels")
        .select("id", { count: "exact", head: true })
        .eq("box_id", invite.box_id)
        .eq("is_archived", false),
      admin
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", invite.created_by)
        .single(),
    ]);

  return (
    <InviteLandingClient
      box={box}
      role={invite.role}
      code={code}
      memberCount={memberCountResult.count ?? 0}
      channelCount={channelCountResult.count ?? 0}
      inviterName={inviterResult.data?.full_name ?? null}
      inviterAvatar={inviterResult.data?.avatar_url ?? null}
    />
  );
}
