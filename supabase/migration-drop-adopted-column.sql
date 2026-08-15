-- dogs.adopted was added for a deck-filtering behavior that was scoped out:
-- adopted/unmatched only affects the Matched section, not deck visibility.
-- No app code reads or writes it anymore.

alter table dogs drop column if exists adopted;
