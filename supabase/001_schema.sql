-- Sponsor Dinner Command Center — Schema
-- Im Supabase SQL Editor ausführen (einmalig), danach 002_seed.sql.
-- Lesen: öffentlich über den Publishable Key. Schreiben: nur über die Vercel-API
-- (/api/write) mit Service Role Key nach Passwort-Login.

create extension if not exists pgcrypto;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text not null default 'Rahmen',
  owner text not null default '',
  contact text not null default '',
  status text not null default 'offen' check (status in ('offen','in Arbeit','wartet','erledigt','entfällt')),
  priority text not null default 'mittel' check (priority in ('hoch','mittel','niedrig')),
  due date,
  answer text not null default '',
  notes text not null default '',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  category text not null default 'Sonstiges',
  quantity text not null default '',
  source text not null default '',
  needed_when text not null default '',
  location text not null default '',
  owner text not null default '',
  status text not null default 'offen' check (status in ('offen','angefragt','bestellt','geklärt','vor Ort','zurückgegeben','entfällt')),
  notes text not null default '',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  org text not null default '',
  phone text not null default '',
  email text not null default '',
  responsible_for text not null default '',
  notes text not null default '',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedule (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'abend' check (kind in ('abend','woche','deadline')),
  day date not null default '2026-09-26',
  start_time text not null default '',
  end_time text not null default '',
  phase text not null default '',
  title text not null,
  who text not null default '',
  notes text not null default '',
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crew (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shifts text[] not null default '{}',
  role text not null default 'Crew',
  zone text not null default '',
  phone text not null default '',
  confirmed boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shifts (
  id text primary key,
  label text not null,
  start_time text not null,
  end_time text not null,
  whatsapp text not null default '',
  lead text not null default '',
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists floor_variants (
  id text primary key,
  name text not null,
  note text not null default '',
  state jsonb not null default '{}'::jsonb,
  is_final boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_log (
  id bigserial primary key,
  entity_type text not null,
  entity_id text,
  action text not null,
  summary text not null default '',
  actor text not null default '',
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['tasks','materials','contacts','schedule','crew','shifts','floor_variants'] loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- RLS: jeder darf lesen, niemand schreibt direkt (nur Service Role über die API)
do $$ declare t text; begin
  foreach t in array array['tasks','materials','contacts','schedule','crew','shifts','floor_variants','activity_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists public_read on %I', t);
    execute format('create policy public_read on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Realtime
do $$ declare t text; begin
  foreach t in array array['tasks','materials','contacts','schedule','crew','shifts','floor_variants','activity_log'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
