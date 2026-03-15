import { NextResponse, type NextRequest } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { welcomeEmail } from "@/lib/email-templates";

// POST /api/auth/welcome — send welcome email after signup
export async function POST(request: NextRequest) {
  const { email, name } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chatterbox.io";

  try {
    await resend.emails.send({
      from: `Chatterbox <${FROM_EMAIL}>`,
      to: email,
      subject: `Welcome to Chatterbox, ${name || "there"}!`,
      html: welcomeEmail(name || "there", appUrl),
    });
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
