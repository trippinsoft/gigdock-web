-- "Link in bio" fallback -----------------------------------------------------
-- Some sources (Instagram especially) only ever say "link in bio", so their
-- posts have no apply link of their own. Store the source's bio/Linktree URL
-- once on the source, and copy it onto each of that source's opportunities that
-- lacks an apply link — so users always get a working Apply button. Generalizes
-- to every future Instagram source: just set its apply_url.

-- 1) Column on sources for the bio link.
alter table public.sources add column if not exists apply_url text;
comment on column public.sources.apply_url is
  'Fallback apply link (the source''s current "link in bio" / Linktree URL) used when a post has no apply link of its own.';

-- 2) Set the bio link for your Instagram source(s). REPLACE the URL with the
--    real link-in-bio destination (their Linktree, application page, etc.).
update public.sources
set apply_url = 'https://REPLACE-WITH-THE-BIO-LINK'
where name = 'United Casting';

-- 3) Trigger: on insert/update, if an opportunity has no apply link, fill it
--    from its source's apply_url. Never overrides a real per-post link.
create or replace function public.fill_apply_link_from_source()
returns trigger language plpgsql as $$
begin
  if new.link is null or btrim(new.link) = '' then
    select s.apply_url into new.link
    from public.sources s
    where s.name = new.source
      and s.apply_url is not null and btrim(s.apply_url) <> ''
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists opp_fill_apply_link on public.opportunities;
create trigger opp_fill_apply_link
  before insert or update on public.opportunities
  for each row execute function public.fill_apply_link_from_source();

-- 4) Backfill: point existing active gigs (with no apply link) at the bio link.
update public.opportunities o
set link = s.apply_url
from public.sources s
where o.source = s.name
  and s.apply_url is not null and btrim(s.apply_url) <> ''
  and (o.link is null or btrim(o.link) = '')
  and o.status = 'active' and o.deleted_at is null;

-- If the bio link ever changes: update sources.apply_url, then re-run step 4
-- with your old URL added to the WHERE (…and o.link = '<old-url>') to refresh
-- the gigs that were pointing at the previous bio link.
