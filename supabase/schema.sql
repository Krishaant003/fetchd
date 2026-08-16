create extension if not exists "pgcrypto";

create table adopters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
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
  user_id uuid not null references auth.users(id),
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

create index if not exists dogs_user_id_idx on dogs (user_id);
create index if not exists adopters_user_id_idx on adopters (user_id);

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

-- dogs / adopters: any authenticated user can read (Discover shows other
-- people's profiles); only the owner can write.
create policy "authenticated read dogs" on dogs for select
  to authenticated using (true);
create policy "owner insert dogs" on dogs for insert
  to authenticated with check (user_id = auth.uid());
create policy "owner update dogs" on dogs for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner delete dogs" on dogs for delete
  to authenticated using (user_id = auth.uid());

create policy "authenticated read adopters" on adopters for select
  to authenticated using (true);
create policy "owner insert adopters" on adopters for insert
  to authenticated with check (user_id = auth.uid());
create policy "owner update adopters" on adopters for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner delete adopters" on adopters for delete
  to authenticated using (user_id = auth.uid());

-- swipes: swiper_id/target_id are dog/adopter row ids, not auth ids, so
-- ownership is checked via a join. Read stays open to authenticated users
-- since recordSwipe must read the *other* party's swipe row to detect a
-- mutual match.
create policy "authenticated read swipes" on swipes for select
  to authenticated using (true);
create policy "owner insert swipes" on swipes for insert
  to authenticated with check (
    exists (select 1 from dogs where dogs.id = swiper_id and dogs.user_id = auth.uid())
    or exists (select 1 from adopters where adopters.id = swiper_id and adopters.user_id = auth.uid())
  );

-- matches: only the two owning parties can see or update a match.
create policy "participant read matches" on matches for select
  to authenticated using (
    exists (select 1 from dogs where dogs.id = dog_id and dogs.user_id = auth.uid())
    or exists (select 1 from adopters where adopters.id = adopter_id and adopters.user_id = auth.uid())
  );
create policy "participant insert matches" on matches for insert
  to authenticated with check (
    exists (select 1 from dogs where dogs.id = dog_id and dogs.user_id = auth.uid())
    or exists (select 1 from adopters where adopters.id = adopter_id and adopters.user_id = auth.uid())
  );
create policy "participant update matches" on matches for update
  to authenticated using (
    exists (select 1 from dogs where dogs.id = dog_id and dogs.user_id = auth.uid())
    or exists (select 1 from adopters where adopters.id = adopter_id and adopters.user_id = auth.uid())
  ) with check (
    exists (select 1 from dogs where dogs.id = dog_id and dogs.user_id = auth.uid())
    or exists (select 1 from adopters where adopters.id = adopter_id and adopters.user_id = auth.uid())
  );

-- messages: only participants in the parent match can read/send.
create policy "participant read messages" on messages for select
  to authenticated using (
    exists (
      select 1 from matches
      join dogs on dogs.id = matches.dog_id
      join adopters on adopters.id = matches.adopter_id
      where matches.id = match_id
        and (dogs.user_id = auth.uid() or adopters.user_id = auth.uid())
    )
  );
create policy "participant insert messages" on messages for insert
  to authenticated with check (
    exists (
      select 1 from matches
      join dogs on dogs.id = matches.dog_id
      join adopters on adopters.id = matches.adopter_id
      where matches.id = match_id
        and (dogs.user_id = auth.uid() or adopters.user_id = auth.uid())
    )
    and (
      (sender_type = 'dog' and exists (select 1 from dogs where dogs.id = sender_id and dogs.user_id = auth.uid()))
      or
      (sender_type = 'adopter' and exists (select 1 from adopters where adopters.id = sender_id and adopters.user_id = auth.uid()))
    )
  );

-- storage: photos stay publicly readable; only authenticated users may write.
create policy "public read photos bucket" on storage.objects for select
  using (bucket_id = 'photos');
create policy "authenticated insert photos bucket" on storage.objects for insert
  to authenticated with check (bucket_id = 'photos');
create policy "authenticated update photos bucket" on storage.objects for update
  to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');
create policy "authenticated delete photos bucket" on storage.objects for delete
  to authenticated using (bucket_id = 'photos');
