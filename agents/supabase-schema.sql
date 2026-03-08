create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  nickname_normalized text generated always as (lower(trim(nickname))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_nickname_not_blank check (char_length(trim(nickname)) between 2 and 20),
  constraint users_nickname_unique_ci unique (nickname_normalized)
);

create trigger trg_users_updated_at
before update on public.users
for each row execute function set_updated_at();

create table if not exists public.places (
  id bigint generated always as identity primary key,
  external_place_key text not null unique,
  name text not null,
  road_address text,
  jibun_address text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  category text,
  phone text,
  mapx numeric(15, 7),
  mapy numeric(15, 7),
  source_link text,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_places_lat_lng on public.places (latitude, longitude);
create trigger trg_places_updated_at
before update on public.places
for each row execute function set_updated_at();

create table if not exists public.place_saves (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  place_id bigint not null references public.places(id) on delete cascade,
  memo text not null default '',
  visit_status text not null default 'planned',
  tags text[] not null default '{}',
  is_public boolean not null default true,
  rating smallint not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_saves_memo_length check (char_length(memo) <= 500),
  constraint place_saves_visit_status check (visit_status in ('planned', 'visited')),
  constraint place_saves_tags_count check (coalesce(array_length(tags, 1), 0) <= 10),
  constraint place_saves_rating_range check (rating between 1 and 3),
  constraint place_saves_user_place_unique unique (user_id, place_id)
);

create index if not exists idx_place_saves_user_created_at on public.place_saves (user_id, created_at desc);
create index if not exists idx_place_saves_place_id on public.place_saves (place_id);
create trigger trg_place_saves_updated_at
before update on public.place_saves
for each row execute function set_updated_at();

create table if not exists public.follows (
  id bigint generated always as identity primary key,
  follower_user_id uuid not null references public.users(id) on delete cascade,
  following_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_no_self check (follower_user_id <> following_user_id),
  constraint follows_unique unique (follower_user_id, following_user_id)
);

create index if not exists idx_follows_follower on public.follows (follower_user_id);
create index if not exists idx_follows_following on public.follows (following_user_id);

alter table public.users disable row level security;
alter table public.places disable row level security;
alter table public.place_saves disable row level security;
alter table public.follows disable row level security;
