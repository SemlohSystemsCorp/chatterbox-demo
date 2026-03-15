import { getAuthUser, getUserBoxes } from "@/lib/data";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const { user, supabase } = await getAuthUser();
  const boxes = await getUserBoxes(supabase, user.id);

  return <SettingsClient user={user} boxes={boxes} />;
}
