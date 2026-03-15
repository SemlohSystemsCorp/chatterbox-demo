"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoxData {
  id: string;
  short_id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  plan: string;
  role: string;
}

interface CreateBoxClientProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  boxes: BoxData[];
}

export function CreateBoxClient({ user, boxes }: CreateBoxClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/dashboard`);
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <AppShell user={user} boxes={boxes}>
      <TopBar
        title="Create a Box"
        actions={
          <Link
            href="/dashboard"
            className="flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13px] text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[480px] px-6 py-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
              <Box className="h-7 w-7 text-black" />
            </div>
            <h2 className="text-[24px] font-bold tracking-tight text-white">
              Create a new Box
            </h2>
            <p className="mt-1 text-[14px] text-[#666]">
              Boxes are workspaces where your team communicates. Set up
              channels, invite people, and start chatting.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="name"
              label="Workspace name"
              placeholder="e.g. Acme Corp, Design Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              error={error || undefined}
            />

            {slug && (
              <div className="rounded-[8px] bg-[#111] px-3 py-2">
                <span className="text-[12px] text-[#555]">URL: </span>
                <span className="text-[12px] font-medium text-[#888]">
                  chatterbox.io/{slug}
                </span>
              </div>
            )}

            <div>
              <label
                htmlFor="description"
                className="mb-[6px] block text-[14px] font-medium text-white"
              >
                Description{" "}
                <span className="font-normal text-[#555]">(optional)</span>
              </label>
              <textarea
                id="description"
                placeholder="What's this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 py-[10px] text-[16px] text-white placeholder:text-[#666] focus:border-white focus:bg-[#222] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#1a1a1a] disabled:text-[#555]"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                loading={loading}
                disabled={!name.trim() || name.trim().length < 2}
                className="w-full"
              >
                Create Box
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
