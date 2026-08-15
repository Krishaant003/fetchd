-- Adds messaging, unmatch, and mark-adopted. Non-destructive: uses ALTER
-- rather than drop/recreate since real seeded profiles already exist.

alter table dogs add column adopted boolean not null default false;

alter table matches drop constraint if exists matches_status_check;
alter table matches add constraint matches_status_check
  check (status in ('pending', 'accepted', 'rejected', 'unmatched', 'adopted'));

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  sender_type text not null check (sender_type in ('adopter', 'dog')),
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;
create policy "public read/write messages" on messages for all using (true) with check (true);
