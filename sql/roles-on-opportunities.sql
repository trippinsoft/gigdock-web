-- Named roles on a source post. One opportunities row stays one post (save /
-- applied / apply link unchanged). `roles` lists every distinct job that post
-- is hiring for so the feed can show "N posts · M roles" and retally under
-- filters. Existing rows get a 1-role array from role_key + casting_specs, then
-- an optional split when requirements already list named roles. A trigger keeps
-- new ingest rows populated without rewriting ingest-rss.
--
-- Later migrations tightened parse_listed_roles() (word-boundary gender, no
-- sentence-fragment matches). Keep that function in sync with
-- src/lib/roles.ts inferRolesFromRequirements.

alter table public.opportunities
  add column if not exists roles jsonb;

comment on column public.opportunities.roles is
  'Array of {label, role_key, casting_specs} for each distinct role on this post. One item when the post is a single open call.';

-- 1-role backfill so every row has a usable array.
update public.opportunities
set roles = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'label', nullif(btrim(coalesce(role_key, title)), ''),
    'role_key', nullif(btrim(role_key), ''),
    'casting_specs', coalesce(casting_specs, '{}'::jsonb)
  ))
)
where roles is null
   or jsonb_typeof(roles) <> 'array'
   or jsonb_array_length(roles) = 0;

-- Split semicolon-separated "Label (details)" lists that ingest already stored
-- in requirements (e.g. the sports-retailer commercial). Leaves a row alone
-- when fewer than two such parts parse.
create or replace function public.parse_listed_roles(req text)
returns jsonb
language plpgsql
immutable
as $$
declare
  cleaned text;
  parts text[];
  p text;
  label text;
  detail text;
  specs jsonb;
  out jsonb := '[]'::jsonb;
  captured text[];
begin
  if req is null or btrim(req) = '' then
    return null;
  end if;
  cleaned := regexp_replace(req, '^\s*(multiple roles|specific roles)\s*:\s*', '', 'i');
  parts := string_to_array(cleaned, ';');
  foreach p in array parts loop
    p := btrim(p, ' .');
    captured := regexp_match(p, '^(.+?)\s*\((.+)\)\s*$');
    if captured is null then
      continue;
    end if;
    label := btrim(captured[1]);
    detail := btrim(captured[2]);
    if length(label) < 2 or length(label) > 80 then
      continue;
    end if;
    specs := '{}'::jsonb;
    if detail ~* '\bany gender\b' or (detail ~* '\bmale\b' and detail ~* '\bfemale\b') then
      null;
    elsif detail ~* '\bfemale\b|\bwomen\b|\bgirl\b' then
      specs := specs || '{"gender":["female"]}'::jsonb;
    elsif detail ~* '\bmale\b|\bmen\b|\bboy\b' then
      specs := specs || '{"gender":["male"]}'::jsonb;
    end if;
    captured := regexp_match(detail, '(\d{1,2})\s*[-–]\s*(\d{1,2})');
    if captured is not null then
      specs := specs || jsonb_build_object(
        'age_min', captured[1]::int,
        'age_max', captured[2]::int
      );
    end if;
    out := out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'label', label,
      'role_key', lower(btrim(regexp_replace(label, '[^a-zA-Z0-9]+', ' ', 'g'))),
      'casting_specs', specs
    )));
  end loop;
  if jsonb_array_length(out) >= 2 then
    return out;
  end if;
  return null;
end;
$$;

update public.opportunities o
set roles = parsed.roles
from (
  select id, public.parse_listed_roles(requirements) as roles
  from public.opportunities
  where deleted_at is null
) parsed
where o.id = parsed.id
  and parsed.roles is not null;

-- Keep new ingest rows populated even before ingest-rss writes `roles`.
-- If ingest (or an editor) already stored 2+ roles, leave them alone.
create or replace function public.ensure_opportunity_roles()
returns trigger language plpgsql as $$
declare parsed jsonb;
begin
  if jsonb_typeof(new.roles) = 'array' and jsonb_array_length(new.roles) >= 2 then
    return new;
  end if;
  parsed := public.parse_listed_roles(new.requirements);
  if parsed is not null then
    new.roles := parsed;
    return new;
  end if;
  if new.roles is null or jsonb_typeof(new.roles) <> 'array' or jsonb_array_length(new.roles) = 0 then
    new.roles := jsonb_build_array(
      jsonb_strip_nulls(jsonb_build_object(
        'label', nullif(btrim(coalesce(new.role_key, new.title)), ''),
        'role_key', nullif(btrim(new.role_key), ''),
        'casting_specs', coalesce(new.casting_specs, '{}'::jsonb)
      ))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists opp_ensure_roles on public.opportunities;
create trigger opp_ensure_roles
before insert or update of requirements, role_key, title, casting_specs, roles
on public.opportunities
for each row execute function public.ensure_opportunity_roles();
