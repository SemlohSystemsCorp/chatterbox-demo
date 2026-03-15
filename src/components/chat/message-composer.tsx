"use client";

import { useState, useCallback } from "react";
import { Send, Plus, Smile, Reply, X } from "lucide-react";
import { EmojiPicker } from "@/components/emoji-picker";
import { ToneAdjuster } from "@/components/chat/tone-adjuster";
import { MentionPicker } from "@/components/chat/mention-picker";
import type { MessageData, MemberData } from "@/lib/chat-helpers";

// ── Types ──

export interface Attachment {
  url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface MessageComposerProps {
  placeholder: string;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  replyingTo: MessageData | null;
  onCancelReply: () => void;
  attachments: Attachment[];
  onRemoveAttachment: (index: number) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  sending: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  /** Members available for @mentions */
  members?: MemberData[];
}

// ── Component ──

export function MessageComposer({
  placeholder,
  newMessage,
  onNewMessageChange,
  replyingTo,
  onCancelReply,
  attachments,
  onRemoveAttachment,
  inputRef,
  fileInputRef,
  uploading,
  sending,
  onInputChange,
  onKeyDown,
  onPaste,
  onFileUpload,
  onSend,
  members,
}: MessageComposerProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);

  // Detect @mention trigger from input
  const handleInputChangeWithMention = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onInputChange(e);

      const value = e.target.value;
      const cursor = e.target.selectionStart;

      // Look backwards from cursor for an unmatched @
      const textBeforeCursor = value.slice(0, cursor);
      const atIdx = textBeforeCursor.lastIndexOf("@");

      if (atIdx >= 0) {
        const charBefore = atIdx > 0 ? textBeforeCursor[atIdx - 1] : " ";
        const query = textBeforeCursor.slice(atIdx + 1);
        // Trigger mention if @ is at start or preceded by whitespace, and query has no spaces
        if ((charBefore === " " || charBefore === "\n" || atIdx === 0) && !query.includes(" ")) {
          setMentionQuery(query);
          setMentionStart(atIdx);
          return;
        }
      }

      setMentionQuery(null);
    },
    [onInputChange],
  );

  const handleMentionSelect = useCallback(
    (member: MemberData) => {
      const handle = member.username || member.email.split("@")[0];
      const before = newMessage.slice(0, mentionStart);
      const after = newMessage.slice(
        mentionStart + 1 + (mentionQuery?.length ?? 0),
      );
      const updated = `${before}<@${handle}> ${after}`;
      onNewMessageChange(updated);
      setMentionQuery(null);

      // Refocus input
      requestAnimationFrame(() => {
        const textarea = inputRef.current;
        if (textarea) {
          const pos = mentionStart + `<@${handle}> `.length;
          textarea.focus();
          textarea.setSelectionRange(pos, pos);
        }
      });
    },
    [newMessage, mentionStart, mentionQuery, onNewMessageChange, inputRef],
  );

  const handleKeyDownWithMention = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // If mention picker is open, let it handle arrow keys, enter, tab, escape
      if (mentionQuery !== null && members && members.length > 0) {
        if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) {
          // The MentionPicker handles these via window keydown listener
          return;
        }
      }
      onKeyDown(e);
    },
    [mentionQuery, members, onKeyDown],
  );

  return (
    <div className="shrink-0 px-4 pb-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onFileUpload}
        accept="image/*,.pdf,.txt,.zip,.json,.mp4,.webm,.mp3,.wav"
      />

      <div className="relative rounded-[8px] border border-[#1a1a1a] bg-[#111] focus-within:border-[#2a2a2a]">
        {/* Mention picker */}
        {mentionQuery !== null && members && members.length > 0 && (
          <MentionPicker
            members={members}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setMentionQuery(null)}
          />
        )}

        {/* Reply bar */}
        {replyingTo && (
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] px-3 py-2">
            <Reply className="h-3.5 w-3.5 shrink-0 text-[#555]" />
            <span className="text-[12px] text-[#888]">
              Replying to{" "}
              <span className="font-semibold text-white">
                {replyingTo.sender.full_name || replyingTo.sender.email}
              </span>
            </span>
            <span className="flex-1 truncate text-[12px] text-[#555]">
              {replyingTo.content.split("\n").find((l) => !l.trim().startsWith("http")) || replyingTo.content.split("\n")[0]}
            </span>
            <button
              onClick={onCancelReply}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#555] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-[#1a1a1a] px-3 py-2">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-[6px] border border-[#2a2a2a] bg-[#0a0a0a]"
              >
                {a.file_type.startsWith("image/") ? (
                  <img
                    src={a.url}
                    alt={a.file_name}
                    className="h-20 w-20 object-cover"
                  />
                ) : a.file_type.startsWith("video/") ? (
                  <div className="flex h-20 w-20 items-center justify-center bg-[#0a0a0a]">
                    <video
                      src={a.url}
                      muted
                      preload="metadata"
                      className="h-20 w-20 object-cover"
                    />
                  </div>
                ) : a.file_type.startsWith("audio/") ? (
                  <div className="flex h-20 w-20 flex-col items-center justify-center px-1">
                    <svg className="h-6 w-6 text-[#555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    <span className="mt-1 max-w-full truncate text-[9px] text-[#444]">
                      {a.file_name}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 flex-col items-center justify-center px-1">
                    <span className="text-[10px] font-bold uppercase text-[#555]">
                      {a.file_name.split(".").pop()}
                    </span>
                    <span className="mt-0.5 max-w-full truncate text-[9px] text-[#444]">
                      {a.file_name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => onRemoveAttachment(i)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end px-3 py-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#555] transition-colors hover:text-white disabled:opacity-50"
            title="Attach file"
          >
            <Plus className="h-5 w-5" />
          </button>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChangeWithMention}
            onKeyDown={handleKeyDownWithMention}
            onPaste={onPaste}
            placeholder={uploading ? "Uploading..." : placeholder}
            rows={1}
            className="max-h-[160px] min-h-[28px] flex-1 resize-none bg-transparent px-1 py-1 text-[14px] leading-[22px] text-white placeholder:text-[#555] focus:outline-none"
          />
          <EmojiPicker
            onSelect={(emoji) => {
              onNewMessageChange(newMessage + emoji);
              inputRef.current?.focus();
            }}
          >
            <button className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#555] transition-colors hover:text-white" title="Emoji">
              <Smile className="h-5 w-5" />
            </button>
          </EmojiPicker>
        </div>

        <div className="flex items-center justify-between border-t border-[#1a1a1a] px-3 py-1.5">
          <div className="text-[11px] text-[#444]">
            <kbd className="rounded bg-[#0a0a0a] px-1 py-0.5 text-[10px] text-[#555]">
              Enter
            </kbd>{" "}
            to send ·{" "}
            <kbd className="rounded bg-[#0a0a0a] px-1 py-0.5 text-[10px] text-[#555]">
              Shift+Enter
            </kbd>{" "}
            new line
          </div>
          <div className="flex items-center gap-1">
            <ToneAdjuster
              text={newMessage}
              onRewrite={(text) => onNewMessageChange(text)}
            />
            <button
              onClick={onSend}
              disabled={(!newMessage.trim() && attachments.length === 0) || sending}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-white text-black transition-colors hover:bg-[#e0e0e0] disabled:bg-[#1a1a1a] disabled:text-[#555]"
              title="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
