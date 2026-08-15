create extension if not exists "pgcrypto";

create table adopters (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  photo_urls text[] not null check (array_length(photo_urls, 1) = 4),
  answer_1 text not null,
  answer_2 text not null,
  answer_3 text not null,
  answer_4 text not null,
  answer_5 text not null,
  created_at timestamptz not null default now()
);

create table dogs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  breed text not null,
  age text not null,
  photo_urls text[] not null check (array_length(photo_urls, 1) = 4),
  answer_1 text not null,
  answer_2 text not null,
  answer_3 text not null,
  answer_4 text not null,
  answer_5 text not null,
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
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'unmatched', 'adopted')),
  created_at timestamptz not null default now(),
  unique (adopter_id, dog_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  sender_type text not null check (sender_type in ('adopter', 'dog')),
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table adopters enable row level security;
alter table dogs enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;

create policy "public read/write adopters" on adopters for all using (true) with check (true);
create policy "public read/write dogs" on dogs for all using (true) with check (true);
create policy "public read/write swipes" on swipes for all using (true) with check (true);
create policy "public read/write matches" on matches for all using (true) with check (true);
create policy "public read/write messages" on messages for all using (true) with check (true);

-- Storage RLS is separate from table RLS above: the "photos" bucket being
-- public only controls unauthenticated read of object URLs, not whether the
-- anon key can upload/delete via the storage API. Open that up the same way.
create policy "public read/write photos bucket" on storage.objects for all
  using (bucket_id = 'photos')
  with check (bucket_id = 'photos');
