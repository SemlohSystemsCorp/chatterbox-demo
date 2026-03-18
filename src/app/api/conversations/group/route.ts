import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participant_ids, name } = await request.json();

  if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length < 2) {
    return NextResponse.json(
      { error: "At least 2 other participants are required" },
      { status: 400 }
    );
  }

  // Use service role to bypass RLS
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create the group conversation
  const { data: conversation, error: convoError } = await admin
    .from("conversations")
    .insert({
      is_group: true,
      name: name?.trim() || null,
    })
    .select("id, short_id")
    .single();

  if (convoError) {
    return NextResponse.json({ error: convoError.message }, { status: 500 });
  }

  // Add all participants (including the creator)
  const allParticipantIds = [user.id, ...participant_ids.filter((id: string) => id !== user.id)];

  const { error: partError } = await admin
    .from("conversation_participants")
    .insert(
      allParticipantIds.map((uid: string) => ({
        conversation_id: conversation.id,
        user_id: uid,
      }))
    );

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }

  return NextResponse.json({ id: conversation.id, short_id: conversation.short_id });
}
