import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinBoxClient } from "./join-box-client";

export const metadata: Metadata = {
  title: "Join a Box",
};

export default function JoinBoxPage() {
  return (
    <Suspense>
      <JoinBoxClient />
    </Suspense>
  );
}
