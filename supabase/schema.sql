create extension if not exists "pgcrypto";

create table adopters (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  photo_url text not null,
  lifestyle_text text not null,
  created_at timestamptz not null default now()
);

create table dogs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  breed text not null,
  age text not null,
  story text not null,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create table swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid not null,
  swiper_type text not null check (swiper_type in ('adopter', 'dog')),
  target_id uuid not null,
  target_type text not null check (target_type in ('adopter', 'dog')),
  direction text not null check (direction in ('right', 'left')),
  created_at timestamptz not null default now(),
  unique (swiper_id, target_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  adopter_id uuid not null references adopters(id),
  dog_id uuid not null references dogs(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (adopter_id, dog_id)
);

alter table adopters enable row level security;
alter table dogs enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;

create policy "public read/write adopters" on adopters for all using (true) with check (true);
create policy "public read/write dogs" on dogs for all using (true) with check (true);
create policy "public read/write swipes" on swipes for all using (true) with check (true);
create policy "public read/write matches" on matches for all using (true) with check (true);
