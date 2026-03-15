import { getAuthUser, getUserBoxes } from "@/lib/data";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage() {
  const { user, supabase } = await getAuthUser();
  const boxes = await getUserBoxes(supabase, user.id);

  return <CheckoutClient user={user} boxes={boxes} />;
}
