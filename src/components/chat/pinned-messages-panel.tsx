"use client";

import { useState, useEffect, useCallback } from "react";
import { Pin, X, Loader2 } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { formatTime, formatDate, getInitials } from "@/lib/chat-helpers";
import type { PinnedMessage } from "@/types";

interface PinnedMessagesPanelProps {
  channelId: string;
  onClose: () => void;
  onUnpin: (messageId: string) => Promise<void>;
}

export function PinnedMessagesPanel({
  channelId,
  onClose,
  onUnpin,
}: PinnedMessagesPanelProps) {
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/pin?channel_id=${channelId}`);
      const data = await res.json();
      setPins(data.pins ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  async function handleUnpin(messageId: string) {
    await onUnpin(messageId);
    setPins((prev) => prev.filter((p) => p.message_id !== messageId));
  }

  return (
    <div className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Pin className="h-3.5 w-3.5 text-[#f59e0b]" />
          <span className="text-[13px] font-semibold text-white">
            Pinned Messages
          </span>
          {!loading && (
            <span className="text-[11px] text-[#555]">
              {pins.length} {pins.length === 1 ? "pin" : "pins"}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[#1a1a1a] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-4 pb-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#555]" />
          <span className="text-[12px] text-[#555]">Loading pinned messages...</span>
        </div>
      ) : pins.length === 0 ? (
        <div className="px-4 pb-3">
          <p className="text-[12px] text-[#555]">
            No pinned messages yet. Pin important messages to keep them easy to find.
          </p>
        </div>
      ) : (
        <div className="max-h-[300px] space-y-1 overflow-auto px-4 pb-3">
          {pins.map((pin) => {
            const sender = pin.message?.sender;
            const initials = sender
              ? getInitials(sender.full_name, sender.email)
              : "?";
            return (
              <div
                key={pin.id}
                className="group flex gap-3 rounded-[6px] bg-[#111] px-3 py-2.5"
              >
                <div className="mt-0.5 shrink-0">
                  {sender?.avatar_url ? (
                    <img
                      src={sender.avatar_url}
                      alt=""
                      className="h-7 w-7 rounded-full"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a1a] text-[10px] font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-white">
                      {sender?.full_name || sender?.email || "Unknown"}
                    </span>
                    <span className="text-[10px] text-[#444]">
                      {pin.message
                        ? `${formatDate(pin.message.created_at)} at ${formatTime(pin.message.created_at)}`
                        : ""}
                    </span>
                  </div>
                  <Markdown className="mt-0.5 text-[12px] leading-[18px] text-[#999] line-clamp-3">
                    {pin.message?.content ?? ""}
                  </Markdown>
                </div>
                <button
                  onClick={() => handleUnpin(pin.message_id)}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#555] opacity-0 transition-all hover:text-[#de1135] group-hover:opacity-100"
                  title="Unpin"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
