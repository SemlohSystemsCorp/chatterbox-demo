"use client";

import { useState, useEffect, useRef } from "react";
import { GraphIcon as BarChart3, CheckIcon as Check, ClockIcon as Clock, PeopleIcon as Users, HistoryIcon as RotateCcw } from "@primer/octicons-react";
import { createClient } from "@/lib/supabase/client";

interface PollOption {
  id: string;
  label: string;
  position: number;
}

interface PollVote {
  id: string;
  option_id: string;
  user_id: string;
}

interface PollData {
  id: string;
  question: string;
  allows_multiple: boolean;
  is_anonymous: boolean;
  expires_at: string | null;
  created_at: string;
  creator_id: string;
}

interface PollCardProps {
  pollId: string;
  question: string;
  currentUserId: string;
}

export function PollCard({ pollId, question, currentUserId }: PollCardProps) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const endEventFired = useRef(false);

  async function fetchPoll() {
    try {
      const res = await fetch(`/api/polls/${pollId}`);
      if (res.ok) {
        const data = await res.json();
        setPoll(data.poll);
        setOptions(data.options);
        setVotes(data.votes);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  // Realtime subscription for vote updates
  useEffect(() => {
    const supabase = createClient();
    const subscription = supabase
      .channel(`poll-votes-${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          const newVote = payload.new as PollVote;
          setVotes((prev) => {
            if (prev.some((v) => v.id === newVote.id)) return prev;
            return [...prev, newVote];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          const oldVote = payload.old as { id: string };
          setVotes((prev) => prev.filter((v) => v.id !== oldVote.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [pollId]);

  // Fire poll end event when expired (once per mount)
  useEffect(() => {
    if (!poll || !poll.expires_at || endEventFired.current) return;
    const expiresAt = new Date(poll.expires_at);
    if (expiresAt >= new Date()) {
      // Set a timer to fire when it expires
      const ms = expiresAt.getTime() - Date.now();
      if (ms > 0 && ms < 86400000) {
        const timer = setTimeout(() => {
          endEventFired.current = true;
          fetch(`/api/polls/${pollId}/end`, { method: "POST" }).catch(() => {});
          // Force re-render to show expired state
          setPoll((prev) => prev ? { ...prev } : prev);
        }, ms);
        return () => clearTimeout(timer);
      }
    } else {
      // Already expired — fire end event
      endEventFired.current = true;
      fetch(`/api/polls/${pollId}/end`, { method: "POST" }).catch(() => {});
    }
  }, [poll, pollId]);

  async function handleVote(optionId: string) {
    if (voting) return;
    if (isExpired) return;
    setVoting(optionId);
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: optionId }),
      });
      if (res.ok) {
        await fetchPoll();
      }
    } finally {
      setVoting(null);
    }
  }

  async function handleRerun() {
    if (rerunning) return;
    setRerunning(true);
    try {
      await fetch(`/api/polls/${pollId}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      setRerunning(false);
    }
  }

  if (loading) {
    return (
      <div className="my-2 rounded-[10px] border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <div className="flex items-center gap-2 text-[13px] text-[#555]">
          <BarChart3 className="h-4 w-4" />
          Loading poll...
        </div>
      </div>
    );
  }

  if (!poll || options.length === 0) {
    return null;
  }

  const totalVotes = votes.length;
  const myVotes = new Set(votes.filter((v) => v.user_id === currentUserId).map((v) => v.option_id));
  const hasVoted = myVotes.size > 0;
  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false;
  const showResults = hasVoted || isExpired;
  const uniqueVoters = new Set(votes.map((v) => v.user_id)).size;
  const isCreator = poll.creator_id === currentUserId;

  // Count votes per option
  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
  }

  return (
    <div className="my-2 max-w-[400px] rounded-[10px] border border-[#1a1a1a] bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-start gap-2 px-4 pt-3 pb-2">
        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-[#888]" />
        <h3 className="text-[14px] font-semibold text-white">{poll.question}</h3>
      </div>

      {/* Options */}
      <div className="space-y-1.5 px-4 pb-3">
        {options
          .sort((a, b) => a.position - b.position)
          .map((opt) => {
            const count = voteCounts[opt.id] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = myVotes.has(opt.id);
            const isVoting = voting === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                disabled={isExpired || !!voting}
                className={`group relative w-full overflow-hidden rounded-[6px] border text-left transition-all disabled:cursor-default ${
                  isSelected
                    ? "border-blue-500/40 bg-blue-500/5"
                    : "border-[#1a1a1a] bg-[#111] hover:border-[#2a2a2a]"
                }`}
              >
                {/* Progress bar — show when expired or voted */}
                {showResults && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all ${
                      isSelected ? "bg-blue-500/10" : "bg-[#1a1a1a]/50"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                    )}
                    <span className={`text-[13px] ${isSelected ? "font-medium text-white" : "text-[#ccc]"}`}>
                      {opt.label}
                    </span>
                  </div>
                  {showResults && (
                    <span className="ml-2 shrink-0 text-[11px] text-[#666]">
                      {count} ({pct}%)
                    </span>
                  )}
                  {isVoting && (
                    <span className="ml-2 shrink-0 text-[11px] text-[#555]">...</span>
                  )}
                </div>
              </button>
            );
          })}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-[#1a1a1a] px-4 py-2 text-[11px] text-[#555]">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {uniqueVoters} {uniqueVoters === 1 ? "vote" : "votes"}
        </span>
        {poll.allows_multiple && <span>Multiple choice</span>}
        {poll.is_anonymous && <span>Anonymous</span>}
        {isExpired && (
          <span className="flex items-center gap-1 text-[#de1135]">
            <Clock className="h-3 w-3" />
            Ended
          </span>
        )}
        {poll.expires_at && !isExpired && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Ends {new Date(poll.expires_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        )}
        {isExpired && isCreator && (
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className="ml-auto flex items-center gap-1 rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-[#888] transition-colors hover:bg-[#222] hover:text-white disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            {rerunning ? "..." : "Re-run"}
          </button>
        )}
      </div>
    </div>
  );
}
