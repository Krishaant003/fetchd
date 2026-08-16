-- Replaces localStorage-generated session_id identity with real Supabase
-- Auth. Demo data seeded under the old identity scheme is discarded
-- (acceptable per docs/superpowers/specs/2026-08-16-auth-design.md).

truncate table messages, matches, swipes, dogs, adopters restart identity cascade;

alter table dogs drop column session_id;
alter table dogs add column user_id uuid not null references auth.users(id);

alter table adopters drop column session_id;
alter table adopters add column user_id uuid not null references auth.users(id);

drop policy "public read/write dogs" on dogs;
drop policy "public read/write adopters" on adopters;
drop policy "public read/write swipes" on swipes;
drop policy "public read/write matches" on matches;
drop policy "public read/write messages" on messages;
drop policy "public read/write photos bucket" on storage.objects;

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
