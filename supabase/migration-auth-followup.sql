-- Follow-up to migration-auth.sql: tightens the messages INSERT policy to
-- verify the caller actually owns the profile named as sender (the
-- original policy only checked match participation, allowing either
-- participant to forge messages "from" the other party), and adds
-- indexes for the user_id columns that fetchOwnedProfiles relies on.

drop policy "participant insert messages" on messages;

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

create index if not exists dogs_user_id_idx on dogs (user_id);
create index if not exists adopters_user_id_idx on adopters (user_id);
