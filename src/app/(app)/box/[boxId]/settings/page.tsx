import {
  getAuthUser,
  getUserBoxes,
  getBoxByShortId,
  getBoxChannels,
  getBoxMembers,
} from "@/lib/data";
import { redirect } from "next/navigation";
import { BoxSettingsClient } from "./box-settings-client";

export default async function BoxSettingsPage({
  params,
}: {
  params: Promise<{ boxId: string }>;
}) {
  const { boxId } = await params;
  const { supabase, user } = await getAuthUser();

  const box = await getBoxByShortId(supabase, boxId, user.id);
  if (!box) {
    redirect("/dashboard");
  }

  const [boxes, channels, members] = await Promise.all([
    getUserBoxes(supabase, user.id),
    getBoxChannels(supabase, box.id),
    getBoxMembers(supabase, box.id),
  ]);

  return (
    <BoxSettingsClient
      user={user}
      boxes={boxes}
      box={box}
      channels={channels}
      members={members}
    />
  );
}
