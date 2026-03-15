import { create } from "zustand";
import type { Box, Channel, Message, Conversation } from "@/types";

interface ChatState {
  // Active selections
  activeBox: Box | null;
  activeChannel: Channel | null;
  activeConversation: Conversation | null;

  // Data
  boxes: Box[];
  channels: Channel[];
  messages: Message[];
  conversations: Conversation[];

  // UI state
  sidebarOpen: boolean;
  threadOpen: boolean;
  activeThreadMessageId: string | null;

  // Actions
  setActiveBox: (box: Box | null) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  setBoxes: (boxes: Box[]) => void;
  setChannels: (channels: Channel[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  setSidebarOpen: (open: boolean) => void;
  setThreadOpen: (open: boolean, messageId?: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeBox: null,
  activeChannel: null,
  activeConversation: null,
  boxes: [],
  channels: [],
  messages: [],
  conversations: [],
  sidebarOpen: true,
  threadOpen: false,
  activeThreadMessageId: null,

  setActiveBox: (activeBox) => set({ activeBox }),
  setActiveChannel: (activeChannel) => set({ activeChannel }),
  setActiveConversation: (activeConversation) => set({ activeConversation }),
  setBoxes: (boxes) => set({ boxes }),
  setChannels: (channels) => set({ channels }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
  setConversations: (conversations) => set({ conversations }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setThreadOpen: (threadOpen, activeThreadMessageId) =>
    set({ threadOpen, activeThreadMessageId: activeThreadMessageId || null }),
}));
