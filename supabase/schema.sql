-- Apply in a Supabase Postgres project before enabling saved scans.
create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  room_label text,
  region text not null default 'Maharashtra',
  created_at timestamptz not null default now()
);
create table if not exists public.detected_items (
  id uuid primary key default gen_random_uuid(),
  scan_session_id uuid not null references public.scan_sessions(id) on delete cascade,
  category text not null,
  description text not null,
  visible_label_text text,
  estimated_wattage_min integer not null,
  estimated_wattage_max integer not null,
  resolved_wattage integer,
  confidence text not null,
  needs_clarification boolean not null default false,
  clarification_answer text,
  hours_per_day numeric,
  bounding_box_json jsonb,
  created_at timestamptz not null default now()
);
alter table public.scan_sessions enable row level security;
alter table public.detected_items enable row level security;
create policy "Users access their scans" on public.scan_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users access their scan items" on public.detected_items for all using (exists (select 1 from public.scan_sessions s where s.id = scan_session_id and s.user_id = auth.uid())) with check (exists (select 1 from public.scan_sessions s where s.id = scan_session_id and s.user_id = auth.uid()));
