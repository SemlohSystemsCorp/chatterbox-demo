import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settings, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-create if missing
  if (!settings) {
    const { data: created, error: createError } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id })
      .select("*")
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ settings: created });
  }

  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Remove fields that shouldn't be updated directly
  delete body.id;
  delete body.user_id;
  delete body.created_at;
  delete body.updated_at;

  const { data: settings, error } = await supabase
    .from("user_settings")
    .update(body)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    // If no row exists yet, upsert
    if (error.code === "PGRST116") {
      const { data: created, error: createError } = await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, ...body })
        .select("*")
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return NextResponse.json({ settings: created });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings });
}
