import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

async function processScheduledMessages(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find all pending messages that are due
  const { data: dueMessages, error: fetchError } = await admin
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueMessages || dueMessages.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sentCount = 0;

  for (const scheduled of dueMessages) {
    try {
      // Insert the actual message
      const insertData: Record<string, unknown> = {
        sender_id: scheduled.sender_id,
        content: scheduled.content,
      };
      if (scheduled.channel_id) insertData.channel_id = scheduled.channel_id;
      if (scheduled.conversation_id) insertData.conversation_id = scheduled.conversation_id;
      if (scheduled.parent_message_id) insertData.parent_message_id = scheduled.parent_message_id;

      const { data: message, error: insertError } = await admin
        .from("messages")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError) {
        await admin
          .from("scheduled_messages")
          .update({ status: "failed" })
          .eq("id", scheduled.id);
        continue;
      }

      // Insert attachments if any
      const attachments = scheduled.attachments as Array<{
        url: string;
        file_name: string;
        file_type: string;
        file_size: number;
      }>;
      if (attachments && attachments.length > 0 && message) {
        await admin.from("attachments").insert(
          attachments.map((a) => ({
            message_id: message.id,
            file_url: a.url,
            file_name: a.file_name,
            file_type: a.file_type,
            file_size: a.file_size,
          }))
        );
      }

      // Mark as sent
      await admin
        .from("scheduled_messages")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", scheduled.id);

      sentCount++;
    } catch {
      await admin
        .from("scheduled_messages")
        .update({ status: "failed" })
        .eq("id", scheduled.id);
    }
  }

  return NextResponse.json({ sent: sentCount });
}

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  return processScheduledMessages(request);
}

export async function POST(request: NextRequest) {
  return processScheduledMessages(request);
}
