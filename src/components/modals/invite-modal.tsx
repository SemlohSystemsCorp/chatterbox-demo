"use client";

import { useState, useEffect, useRef } from "react";
import { X, Copy, Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  boxId: string;
  boxName: string;
}

export function InviteModal({ open, onClose, boxId, boxName }: InviteModalProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setInviteCode(null);
      setCopied(false);
      setError("");
      generateInvite();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function generateInvite() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          box_id: boxId,
          expires_in_hours: 168, // 7 days
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create invite");
      } else {
        setInviteCode(data.invite.code);
      }
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  function handleCopy() {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join?code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  const inviteLink = inviteCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${inviteCode}`
    : "";

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full max-w-[440px] rounded-[12px] border border-[#1a1a1a] bg-[#111] shadow-[0_16px_64px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
          <h2 className="text-[16px] font-bold text-white">
            Invite people to {boxName}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {error && (
            <div className="mb-4 rounded-[8px] bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#333] border-t-white" />
            </div>
          ) : inviteCode ? (
            <>
              <p className="mb-3 text-[13px] text-[#666]">
                Share this link to invite people. Expires in 7 days.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-[8px] bg-[#0a0a0a] px-3 py-2.5">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                  <span className="truncate text-[13px] text-[#aaa]">
                    {inviteLink}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-4 rounded-[8px] bg-[#0a0a0a] px-3 py-2.5">
                <p className="text-[12px] text-[#555]">
                  Invite code:{" "}
                  <span className="font-mono font-medium text-white">
                    {inviteCode}
                  </span>
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[#1a1a1a] px-5 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
