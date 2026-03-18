import type { Metadata } from "next";
import { CreateBoxClient } from "./create-box-client";

export const metadata: Metadata = {
  title: "Create a Box",
};

export default function CreateBoxPage() {
  return <CreateBoxClient />;
}
