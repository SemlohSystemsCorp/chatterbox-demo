import { create } from "zustand";

type ModalType =
  | "create-box"
  | "create-channel"
  | "invite-member"
  | "user-profile"
  | "preferences"
  | "start-call"
  | "create-group-dm"
  | null;

interface UIState {
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;
  commandPaletteOpen: boolean;
  theme: "light" | "dark" | "system";

  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  modalData: null,
  commandPaletteOpen: false,
  theme: "system",

  openModal: (activeModal, data) =>
    set({ activeModal, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setTheme: (theme) => set({ theme }),
}));
