import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import translate from "google-translate-api-x";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, target_language } = await request.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const targetLang = target_language || "en";

  try {
    const result = await translate(text, { to: targetLang });
    return NextResponse.json({
      translation: result.text,
      detected_language: result.from.language.iso,
    });
  } catch {
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
