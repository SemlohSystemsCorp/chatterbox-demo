-- ============================================================
-- Expanded user_settings: ~100 settings across all categories
-- ============================================================

-- Drop old table and recreate with comprehensive columns
drop table if exists public.user_settings;

create table public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,

  -- ── Profile ──
  display_name text not null default '',
  bio text not null default '',
  pronouns text not null default '',
  phone text not null default '',
  location text not null default '',
  website text not null default '',
  birthday text not null default '',
  company text not null default '',
  job_title text not null default '',

  -- ── Account ──
  email_verified boolean not null default false,
  two_factor_enabled boolean not null default false,
  login_notifications boolean not null default true,
  session_timeout_minutes integer not null default 0,
  active_sessions_limit integer not null default 5,
  allow_data_export boolean not null default true,
  deactivation_scheduled boolean not null default false,

  -- ── Appearance ──
  theme text not null default 'dark' check (theme in ('light', 'dark', 'system')),
  accent_color text not null default '#276ef1',
  font_size text not null default 'medium' check (font_size in ('small', 'medium', 'large')),
  compact_mode boolean not null default false,
  show_avatars boolean not null default true,
  animate_emoji boolean not null default true,
  show_color_gradients boolean not null default true,
  message_density text not null default 'default' check (message_density in ('compact', 'default', 'comfortable')),
  sidebar_width text not null default 'default' check (sidebar_width in ('narrow', 'default', 'wide')),
  show_user_status boolean not null default true,
  show_clock boolean not null default false,
  use_24h_time boolean not null default false,
  reduce_motion boolean not null default false,
  high_contrast boolean not null default false,

  -- ── Notifications ──
  notifications_enabled boolean not null default true,
  notification_sound text not null default 'default',
  notification_volume integer not null default 80,
  desktop_notifications boolean not null default true,
  mobile_push_notifications boolean not null default true,
  email_notifications boolean not null default true,
  notify_on_mention boolean not null default true,
  notify_on_dm boolean not null default true,
  notify_on_reply boolean not null default true,
  notify_on_reaction boolean not null default false,
  notify_on_channel_activity boolean not null default false,
  notify_on_member_join boolean not null default false,
  notify_on_member_leave boolean not null default false,
  notify_on_call boolean not null default true,
  notification_schedule_enabled boolean not null default false,
  notification_schedule_start time default '09:00',
  notification_schedule_end time default '17:00',
  notification_schedule_timezone text not null default 'UTC',
  notification_schedule_days text not null default 'mon,tue,wed,thu,fri',
  mute_all_sounds boolean not null default false,
  badge_count_enabled boolean not null default true,
  flash_taskbar boolean not null default true,
  notification_preview boolean not null default true,

  -- ── Chat & Messaging ──
  send_on_enter boolean not null default true,
  show_link_previews boolean not null default true,
  show_media_inline boolean not null default true,
  auto_play_videos boolean not null default false,
  auto_play_gifs boolean not null default true,
  enable_spellcheck boolean not null default true,
  enable_autocorrect boolean not null default true,
  enable_markdown boolean not null default true,
  enable_code_blocks boolean not null default true,
  show_typing_indicator boolean not null default true,
  show_read_receipts boolean not null default true,
  convert_emoticons boolean not null default true,
  suggest_emoji boolean not null default true,
  large_emoji boolean not null default true,
  message_grouping_minutes integer not null default 5,
  default_emoji_skin_tone integer not null default 0,
  chat_bubble_style text not null default 'default' check (chat_bubble_style in ('default', 'minimal', 'bubble')),

  -- ── Privacy ──
  show_online_status boolean not null default true,
  show_last_seen boolean not null default true,
  allow_dms_from text not null default 'everyone' check (allow_dms_from in ('everyone', 'box_members', 'none')),
  allow_friend_requests boolean not null default true,
  show_current_activity boolean not null default true,
  show_profile_photo_to text not null default 'everyone' check (show_profile_photo_to in ('everyone', 'box_members', 'none')),
  allow_message_requests boolean not null default true,
  block_invites boolean not null default false,
  hide_email boolean not null default false,
  hide_phone boolean not null default true,
  discoverable boolean not null default true,
  allow_read_receipts boolean not null default true,
  allow_typing_indicator boolean not null default true,

  -- ── Accessibility ──
  screen_reader_optimized boolean not null default false,
  keyboard_navigation boolean not null default false,
  focus_indicators boolean not null default true,
  caption_enabled boolean not null default false,
  dyslexia_font boolean not null default false,
  underline_links boolean not null default false,
  text_spacing text not null default 'default' check (text_spacing in ('default', 'wide', 'wider')),
  saturation text not null default 'default' check (saturation in ('low', 'default', 'high')),

  -- ── Language & Region ──
  language text not null default 'en',
  timezone text not null default 'UTC',
  date_format text not null default 'MMM d, yyyy',
  time_format text not null default 'h:mm a',
  first_day_of_week text not null default 'sunday' check (first_day_of_week in ('sunday', 'monday', 'saturday')),
  number_format text not null default 'en-US',
  spell_check_language text not null default 'en',
  translate_messages boolean not null default false,
  auto_detect_language boolean not null default true,

  -- ── Audio & Video ──
  default_mic text not null default '',
  default_speaker text not null default '',
  default_camera text not null default '',
  auto_adjust_mic boolean not null default true,
  noise_suppression boolean not null default true,
  echo_cancellation boolean not null default true,
  auto_gain_control boolean not null default true,
  camera_mirror boolean not null default true,
  camera_hd boolean not null default true,
  blur_background boolean not null default false,
  start_calls_muted boolean not null default false,
  start_calls_camera_off boolean not null default false,
  auto_join_audio boolean not null default true,
  call_ringtone text not null default 'default',

  -- ── Advanced ──
  developer_mode boolean not null default false,
  debug_logging boolean not null default false,
  hardware_acceleration boolean not null default true,
  auto_update boolean not null default true,
  crash_reports boolean not null default true,
  usage_analytics boolean not null default true,
  experimental_features boolean not null default false,
  sync_across_devices boolean not null default true,
  data_saver_mode boolean not null default false,
  preload_media boolean not null default true,
  cache_size_mb integer not null default 500,
  log_retention_days integer not null default 30,
  keyboard_shortcuts_enabled boolean not null default true,
  custom_css text not null default '',
  startup_page text not null default 'dashboard' check (startup_page in ('dashboard', 'last_visited', 'specific_box')),
  startup_box_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);

-- Auto-create settings row on profile creation
create or replace function public.handle_new_settings()
returns trigger as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute procedure public.handle_new_settings();

-- Updated_at trigger
create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();
