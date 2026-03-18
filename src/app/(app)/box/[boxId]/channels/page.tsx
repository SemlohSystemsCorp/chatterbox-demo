import type { Metadata } from "next";
import { getAuthUser, getUserBoxes, getBoxByShortId, getBoxChannels } from "@/lib/data";
import { redirect } from "next/navigation";
import { ChannelsPageClient } from "./channels-page-client";

export const metadata: Metadata = {
  title: "Channels",
};

export default async function ChannelsPage({
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

  const [boxes, channels] = await Promise.all([
    getUserBoxes(supabase, user.id),
    getBoxChannels(supabase, box.id),
  ]);

  return (
    <ChannelsPageClient
      user={user}
      boxes={boxes}
      box={box}
      channels={channels}
    />
  );
}
