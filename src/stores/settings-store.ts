import { create } from "zustand";

const STORAGE_KEY = "chatterbox_settings";

// Keys stored in localStorage for instant load before DB fetch
const LOCAL_KEYS = [
  "theme", "accent_color", "font_size", "compact_mode", "show_avatars",
  "animate_emoji", "message_density", "sidebar_width", "show_clock",
  "use_24h_time", "reduce_motion", "high_contrast", "send_on_enter",
  "show_link_previews", "show_media_inline", "auto_play_gifs",
  "enable_markdown", "large_emoji", "show_typing_indicator",
  "show_read_receipts", "notification_sound", "notification_volume",
  "mute_all_sounds", "keyboard_shortcuts_enabled", "dyslexia_font",
  "language", "timezone",
] as const;

export interface Settings {
  // Profile
  display_name: string;
  bio: string;
  pronouns: string;
  phone: string;
  location: string;
  website: string;
  birthday: string;
  company: string;
  job_title: string;

  // Account
  email_verified: boolean;
  two_factor_enabled: boolean;
  login_notifications: boolean;
  session_timeout_minutes: number;
  active_sessions_limit: number;
  allow_data_export: boolean;
  deactivation_scheduled: boolean;

  // Appearance
  theme: string;
  accent_color: string;
  font_size: string;
  compact_mode: boolean;
  show_avatars: boolean;
  animate_emoji: boolean;
  show_color_gradients: boolean;
  message_density: string;
  sidebar_width: string;
  show_user_status: boolean;
  show_clock: boolean;
  use_24h_time: boolean;
  reduce_motion: boolean;
  high_contrast: boolean;

  // Notifications
  notifications_enabled: boolean;
  notification_sound: string;
  notification_volume: number;
  desktop_notifications: boolean;
  mobile_push_notifications: boolean;
  email_notifications: boolean;
  notify_on_mention: boolean;
  notify_on_dm: boolean;
  notify_on_reply: boolean;
  notify_on_reaction: boolean;
  notify_on_channel_activity: boolean;
  notify_on_member_join: boolean;
  notify_on_member_leave: boolean;
  notify_on_call: boolean;
  notification_schedule_enabled: boolean;
  notification_schedule_start: string;
  notification_schedule_end: string;
  notification_schedule_timezone: string;
  notification_schedule_days: string;
  mute_all_sounds: boolean;
  badge_count_enabled: boolean;
  flash_taskbar: boolean;
  notification_preview: boolean;

  // Chat & Messaging
  send_on_enter: boolean;
  show_link_previews: boolean;
  show_media_inline: boolean;
  auto_play_videos: boolean;
  auto_play_gifs: boolean;
  enable_spellcheck: boolean;
  enable_autocorrect: boolean;
  enable_markdown: boolean;
  enable_code_blocks: boolean;
  show_typing_indicator: boolean;
  show_read_receipts: boolean;
  convert_emoticons: boolean;
  suggest_emoji: boolean;
  large_emoji: boolean;
  message_grouping_minutes: number;
  default_emoji_skin_tone: number;
  chat_bubble_style: string;

  // Privacy
  show_online_status: boolean;
  show_last_seen: boolean;
  allow_dms_from: string;
  allow_friend_requests: boolean;
  show_current_activity: boolean;
  show_profile_photo_to: string;
  allow_message_requests: boolean;
  block_invites: boolean;
  hide_email: boolean;
  hide_phone: boolean;
  discoverable: boolean;
  allow_read_receipts: boolean;
  allow_typing_indicator: boolean;

  // Accessibility
  screen_reader_optimized: boolean;
  keyboard_navigation: boolean;
  focus_indicators: boolean;
  caption_enabled: boolean;
  dyslexia_font: boolean;
  underline_links: boolean;
  text_spacing: string;
  saturation: string;

  // Language & Region
  language: string;
  timezone: string;
  date_format: string;
  time_format: string;
  first_day_of_week: string;
  number_format: string;
  spell_check_language: string;
  translate_messages: boolean;
  auto_detect_language: boolean;

  // Audio & Video
  default_mic: string;
  default_speaker: string;
  default_camera: string;
  auto_adjust_mic: boolean;
  noise_suppression: boolean;
  echo_cancellation: boolean;
  auto_gain_control: boolean;
  camera_mirror: boolean;
  camera_hd: boolean;
  blur_background: boolean;
  start_calls_muted: boolean;
  start_calls_camera_off: boolean;
  auto_join_audio: boolean;
  call_ringtone: string;

  // Advanced
  developer_mode: boolean;
  debug_logging: boolean;
  hardware_acceleration: boolean;
  auto_update: boolean;
  crash_reports: boolean;
  usage_analytics: boolean;
  experimental_features: boolean;
  sync_across_devices: boolean;
  data_saver_mode: boolean;
  preload_media: boolean;
  cache_size_mb: number;
  log_retention_days: number;
  keyboard_shortcuts_enabled: boolean;
  custom_css: string;
  startup_page: string;
  startup_box_id: string | null;
}

const defaultSettings: Settings = {
  display_name: "", bio: "", pronouns: "", phone: "", location: "",
  website: "", birthday: "", company: "", job_title: "",
  email_verified: false, two_factor_enabled: false, login_notifications: true,
  session_timeout_minutes: 0, active_sessions_limit: 5, allow_data_export: true,
  deactivation_scheduled: false,
  theme: "dark", accent_color: "#276ef1", font_size: "medium",
  compact_mode: false, show_avatars: true, animate_emoji: true,
  show_color_gradients: true, message_density: "default", sidebar_width: "default",
  show_user_status: true, show_clock: false, use_24h_time: false,
  reduce_motion: false, high_contrast: false,
  notifications_enabled: true, notification_sound: "default",
  notification_volume: 80, desktop_notifications: true,
  mobile_push_notifications: true, email_notifications: true,
  notify_on_mention: true, notify_on_dm: true, notify_on_reply: true,
  notify_on_reaction: false, notify_on_channel_activity: false,
  notify_on_member_join: false, notify_on_member_leave: false,
  notify_on_call: true, notification_schedule_enabled: false,
  notification_schedule_start: "09:00", notification_schedule_end: "17:00",
  notification_schedule_timezone: "UTC", notification_schedule_days: "mon,tue,wed,thu,fri",
  mute_all_sounds: false, badge_count_enabled: true, flash_taskbar: true,
  notification_preview: true,
  send_on_enter: true, show_link_previews: true, show_media_inline: true,
  auto_play_videos: false, auto_play_gifs: true, enable_spellcheck: true,
  enable_autocorrect: true, enable_markdown: true, enable_code_blocks: true,
  show_typing_indicator: true, show_read_receipts: true, convert_emoticons: true,
  suggest_emoji: true, large_emoji: true, message_grouping_minutes: 5,
  default_emoji_skin_tone: 0, chat_bubble_style: "default",
  show_online_status: true, show_last_seen: true, allow_dms_from: "everyone",
  allow_friend_requests: true, show_current_activity: true,
  show_profile_photo_to: "everyone", allow_message_requests: true,
  block_invites: false, hide_email: false, hide_phone: true,
  discoverable: true, allow_read_receipts: true, allow_typing_indicator: true,
  screen_reader_optimized: false, keyboard_navigation: false,
  focus_indicators: true, caption_enabled: false, dyslexia_font: false,
  underline_links: false, text_spacing: "default", saturation: "default",
  language: "en", timezone: "UTC", date_format: "MMM d, yyyy",
  time_format: "h:mm a", first_day_of_week: "sunday",
  number_format: "en-US", spell_check_language: "en",
  translate_messages: false, auto_detect_language: true,
  default_mic: "", default_speaker: "", default_camera: "",
  auto_adjust_mic: true, noise_suppression: true, echo_cancellation: true,
  auto_gain_control: true, camera_mirror: true, camera_hd: true,
  blur_background: false, start_calls_muted: false,
  start_calls_camera_off: false, auto_join_audio: true, call_ringtone: "default",
  developer_mode: false, debug_logging: false, hardware_acceleration: true,
  auto_update: true, crash_reports: true, usage_analytics: true,
  experimental_features: false, sync_across_devices: true,
  data_saver_mode: false, preload_media: true, cache_size_mb: 500,
  log_retention_days: 30, keyboard_shortcuts_enabled: true,
  custom_css: "", startup_page: "dashboard", startup_box_id: null,
};

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  saving: boolean;
  setSettings: (settings: Partial<Settings>) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: (updates: Partial<Settings>) => Promise<void>;
  updateSetting: (key: keyof Settings, value: unknown) => void;
}

function loadLocal(): Partial<Settings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocal(settings: Settings) {
  if (typeof window === "undefined") return;
  const subset: Record<string, unknown> = {};
  for (const key of LOCAL_KEYS) {
    subset[key] = settings[key];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subset));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...defaultSettings, ...loadLocal() },
  loaded: false,
  saving: false,

  setSettings: (partial) => {
    const merged = { ...get().settings, ...partial };
    saveLocal(merged);
    set({ settings: merged });
  },

  loadFromServer: async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) {
        const { id, user_id, created_at, updated_at, ...rest } = data.settings;
        const merged = { ...defaultSettings, ...rest };
        saveLocal(merged);
        set({ settings: merged, loaded: true });
      }
    } catch {
      // Silently fail — local settings still work
    }
  },

  saveToServer: async (updates) => {
    const merged = { ...get().settings, ...updates };
    saveLocal(merged);
    set({ settings: merged, saving: true });

    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {
      // Silently fail — settings persisted locally
    }

    set({ saving: false });
  },

  updateSetting: (key, value) => {
    const updates = { [key]: value } as Partial<Settings>;
    get().saveToServer(updates);
  },
}));
