"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface TypingUser {
  user_id: string;
  user_name: string;
}

/**
 * Broadcasts and receives typing indicators via Supabase Realtime broadcast.
 * Ephemeral — no DB writes, no persistence.
 */
export function useTyping(
  roomKey: string,
  userId: string,
  userName: string
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastBroadcast = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(`typing-${roomKey}`);

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const { user_id, user_name } = payload.payload as TypingUser;
        if (user_id === userId) return;

        // Add or refresh this user's typing state
        setTypingUsers((prev) => {
          if (!prev.some((u) => u.user_id === user_id)) {
            return [...prev, { user_id, user_name }];
          }
          return prev;
        });

        // Clear existing timeout for this user
        const existing = typingTimeouts.current.get(user_id);
        if (existing) clearTimeout(existing);

        // Remove after 3 seconds of no typing
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.user_id !== user_id));
          typingTimeouts.current.delete(user_id);
        }, 3000);
        typingTimeouts.current.set(user_id, timeout);
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        const { user_id } = payload.payload as { user_id: string };
        setTypingUsers((prev) => prev.filter((u) => u.user_id !== user_id));
        const existing = typingTimeouts.current.get(user_id);
        if (existing) clearTimeout(existing);
        typingTimeouts.current.delete(user_id);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      // Clear all timeouts
      typingTimeouts.current.forEach((t) => clearTimeout(t));
      typingTimeouts.current.clear();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomKey, userId]);

  // Throttled broadcast — at most once per second
  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastBroadcast.current < 1000) return;
    lastBroadcast.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, user_name: userName },
    });
  }, [userId, userName]);

  const stopTyping = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { user_id: userId },
    });
  }, [userId]);

  return { typingUsers, broadcastTyping, stopTyping };
}
