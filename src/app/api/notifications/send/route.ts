import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { notificationEmail } from "@/lib/email-templates";

// POST /api/notifications/send — create notification + optionally send email
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    user_ids,
    type,
    title,
    body,
    box_id,
    channel_id,
    conversation_id,
    message_id,
  } = await request.json();

  if (!user_ids?.length || !type || !title) {
    return NextResponse.json(
      { error: "user_ids, type, and title are required" },
      { status: 400 }
    );
  }

  // Filter out the actor from recipients
  const recipientIds = (user_ids as string[]).filter((id) => id !== user.id);
  if (recipientIds.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Fetch recipient profiles and settings
  const { data: recipients } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", recipientIds);

  // Fetch user settings for email preferences
  const { data: settingsRows } = await supabase
    .from("user_settings")
    .select("user_id, notifications_enabled, email_notifications, notify_on_mention, notify_on_dm, notify_on_reply, notify_on_reaction")
    .in("user_id", recipientIds);

  const settingsMap = new Map(
    (settingsRows ?? []).map((s) => [s.user_id, s])
  );

  // Fetch notification preferences (mute overrides)
  const { data: muteRows } = await supabase
    .from("notification_preferences")
    .select("user_id, mute_all, mute_at_mentions, mute_dms, mute_threads")
    .in("user_id", recipientIds)
    .or(
      channel_id
        ? `channel_id.eq.${channel_id},channel_id.is.null`
        : "channel_id.is.null"
    );

  const muteMap = new Map<string, { mute_all: boolean; mute_at_mentions: boolean; mute_dms: boolean; mute_threads: boolean }>();
  for (const row of muteRows ?? []) {
    // Channel-specific overrides take precedence, but we just use the most restrictive
    const existing = muteMap.get(row.user_id);
    if (!existing || row.mute_all) {
      muteMap.set(row.user_id, row);
    }
  }

  // Get actor info for email
  const { data: actor } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const actorName = actor?.full_name || actor?.email || "Someone";

  const notifications: {
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    box_id: string | null;
    channel_id: string | null;
    conversation_id: string | null;
    message_id: string | null;
    actor_id: string;
    email_sent: boolean;
  }[] = [];

  const emailPromises: Promise<unknown>[] = [];

  for (const recipient of recipients ?? []) {
    const settings = settingsMap.get(recipient.id);
    const mute = muteMap.get(recipient.id);

    // Check if notifications are enabled
    if (settings?.notifications_enabled === false) continue;

    // Check mute settings
    if (mute?.mute_all) continue;
    if (type === "mention" && mute?.mute_at_mentions) continue;
    if (type === "dm" && mute?.mute_dms) continue;
    if (type === "reply" && mute?.mute_threads) continue;

    // Check type-specific settings
    if (type === "mention" && settings?.notify_on_mention === false) continue;
    if (type === "dm" && settings?.notify_on_dm === false) continue;
    if (type === "reply" && settings?.notify_on_reply === false) continue;
    if (type === "reaction" && settings?.notify_on_reaction === false) continue;

    let emailSent = false;

    // Only send emails for invite-type notifications (not per-message)
    const emailTypes = ["invite"];
    if (
      emailTypes.includes(type) &&
      settings?.email_notifications !== false &&
      recipient.email
    ) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://getchatterbox.app";
      let link = appUrl;
      if (box_id && channel_id) {
        link = `${appUrl}/box/${box_id}`;
      }

      emailPromises.push(
        resend.emails
          .send({
            from: `Chatterbox <${FROM_EMAIL}>`,
            to: recipient.email,
            subject: title,
            html: notificationEmail(actorName, title, body || "", link),
          })
          .then(() => {
            emailSent = true;
          })
          .catch(() => {
            // Email send failed, still create notification
          })
      );
    }

    notifications.push({
      user_id: recipient.id,
      type,
      title,
      body: body || null,
      box_id: box_id || null,
      channel_id: channel_id || null,
      conversation_id: conversation_id || null,
      message_id: message_id || null,
      actor_id: user.id,
      email_sent: emailSent,
    });
  }

  // Wait for emails
  await Promise.allSettled(emailPromises);

  // Insert all notifications
  if (notifications.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .insert(notifications);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ sent: notifications.length });
}
