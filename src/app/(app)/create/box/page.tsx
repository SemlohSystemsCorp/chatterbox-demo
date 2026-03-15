import { getAuthUser, getUserBoxes } from "@/lib/data";
import { CreateBoxClient } from "./create-box-client";

export default async function CreateBoxPage() {
  const { supabase, user } = await getAuthUser();
  const boxes = await getUserBoxes(supabase, user.id);

  return <CreateBoxClient user={user} boxes={boxes} />;
}
