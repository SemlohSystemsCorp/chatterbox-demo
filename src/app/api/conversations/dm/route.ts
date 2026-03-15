import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  // Auth check with user's client
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { target_user_id } = await request.json();

  if (!target_user_id || target_user_id === user.id) {
    return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
  }

  // Use service role to bypass RLS for conversation creation
  // (SELECT policy requires being a participant, but we haven't added participants yet)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if a 1:1 conversation already exists between these two users
  const { data: myConvos } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (myConvos && myConvos.length > 0) {
    const myConvoIds = myConvos.map((c) => c.conversation_id);

    const { data: theirConvos } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", target_user_id)
      .in("conversation_id", myConvoIds);

    if (theirConvos && theirConvos.length > 0) {
      const sharedIds = theirConvos.map((c) => c.conversation_id);

      const { data: existing } = await admin
        .from("conversations")
        .select("id, short_id")
        .in("id", sharedIds)
        .eq("is_group", false)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ id: existing.id, short_id: existing.short_id });
      }
    }
  }

  // Create new 1:1 conversation
  const { data: conversation, error: convoError } = await admin
    .from("conversations")
    .insert({ is_group: false })
    .select("id, short_id")
    .single();

  if (convoError) {
    return NextResponse.json({ error: convoError.message }, { status: 500 });
  }

  // Add both participants
  const { error: partError } = await admin
    .from("conversation_participants")
    .insert([
      { conversation_id: conversation.id, user_id: user.id },
      { conversation_id: conversation.id, user_id: target_user_id },
    ]);

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }

  return NextResponse.json({ id: conversation.id, short_id: conversation.short_id });
}
