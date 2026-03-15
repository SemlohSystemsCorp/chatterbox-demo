"use client";

import Link from "next/link";
import { MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteLandingClientProps {
  box?: {
    id: string;
    name: string;
    slug: string;
    icon_url: string | null;
  };
  role?: string;
  code?: string;
  error?: string;
}

export function InviteLandingClient({
  box,
  role,
  code,
  error,
}: InviteLandingClientProps) {
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
        <div className="w-full max-w-[400px] text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2a0f14]">
            <AlertCircle className="h-7 w-7 text-[#de1135]" />
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-white">
            Invalid Invite
          </h1>
          <p className="mt-2 text-[14px] text-[#de1135]">{error}</p>
          <div className="mt-8">
            <Link href="/login">
              <Button className="w-full">Go to Chatterbox</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!box) return null;

  const initials = box.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
      <div className="w-full max-w-[400px] text-center">
        {/* Logo */}
        <div className="mx-auto mb-8 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
            <MessageSquare className="h-4 w-4 text-black" />
          </div>
          <span className="text-[15px] font-bold text-white">Chatterbox</span>
        </div>

        <h1 className="text-[24px] font-bold tracking-tight text-white">
          You&apos;ve been invited
        </h1>
        <p className="mt-1 text-[14px] text-[#666]">
          Sign in or create an account to join this workspace.
        </p>

        {/* Box preview */}
        <div className="mx-auto mt-6 mb-8 rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-6">
          {box.icon_url ? (
            <img
              src={box.icon_url}
              alt=""
              className="mx-auto mb-3 h-14 w-14 rounded-xl"
            />
          ) : (
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[18px] font-bold text-black">
              {initials}
            </div>
          )}
          <div className="text-[18px] font-bold text-white">{box.name}</div>
          <div className="mt-1 text-[13px] capitalize text-[#555]">
            Join as {role}
          </div>
        </div>

        <div className="space-y-3">
          <Link href={`/login?redirect=/join?code=${code}`}>
            <Button className="w-full">Sign in to join</Button>
          </Link>
          <Link href={`/signup?redirect=/join?code=${code}`}>
            <Button variant="secondary" className="w-full">
              Create an account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
