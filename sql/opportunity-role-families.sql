-- ============================================================================
-- opportunities.role_families — coarse role-family classifier (Phase B)
--
-- Adds a structured classifier so crew user roles have an opportunity-side
-- target to match against. Values live in a small enum aligned with
-- work_roles_catalog.opportunity_role_families:
--
--   production_assistant, camera, grip_electric, sound, hair_makeup,
--   wardrobe, art_department, locations
--
-- Absence is UNKNOWN, not MISMATCH — matching logic in gigfit_match must
-- treat an empty array as "no signal" (never as a role blocker). This lets
-- an unclassified opportunity stay eligible while the classifier catches up.
--
-- Populated by a CONSERVATIVE keyword backfill over title + summary +
-- requirements. High-confidence phrases only — better to leave a row
-- unclassified than mis-classify it. Future extractor patches should emit
-- role_families natively at ingest time.
--
-- Idempotent. Safe to re-run — WHERE clause guards each family
-- independently and the backfill only ADDS families (never removes them).
-- ============================================================================

alter table public.opportunities
  add column if not exists role_families text[] not null default '{}'::text[];

create index if not exists opportunities_role_families_gin
  on public.opportunities using gin (role_families);


-- ---------------------------------------------------------------------------
-- Conservative keyword backfill.
--
-- Rules — regexes MUST match whole-word/phrase and require enough context
-- to disambiguate. Examples of REJECTED broad tokens (would over-match):
--   \moperator\M         — hits "phone operator", "machine operator"
--   \bgrip\b             — hits "get a grip", "grip strength"
--   \bpa\b               — hits "PA" state abbreviation, "Pennsylvania"
--
-- The classifier runs once per row over the concatenation of
-- title + ' ' + summary + ' ' + requirements. All comparisons are
-- case-insensitive (~*).
-- ---------------------------------------------------------------------------

with corpus as (
  -- Guards: skip any row that is clearly a performer casting call, even
  -- if it uses crew vocabulary as scene description.
  --   1. casting_specs.work_type is set → the extractor already labeled
  --      it a performer type; trust it.
  --   2. title starts with "Background" → nearly always a background
  --      actor casting call in this dataset.
  --   3. text contains diagnostic performer phrases (portray/portraying/
  --      background talent/to play/casting … as …) → those postings are
  --      performers PLAYING crew characters, not hiring crew.
  select id,
         lower(
           coalesce(title,'')      || ' ' ||
           coalesce(summary,'')    || ' ' ||
           coalesce(requirements,'')
         ) as txt
    from public.opportunities
   where deleted_at is null
     and casting_specs->>'work_type' is null
     and lower(coalesce(title,'')) !~* '^\s*background\y'
     and lower(
           coalesce(title,'')   || ' ' ||
           coalesce(summary,'') || ' ' ||
           coalesce(requirements,'')
         ) !~* '\y(portray(ing|al|als)?|background\s+talent|to\s+play|casting\s+talent\s+to)\y'
),
matched as (
  select id,
         array_remove(array[
           -- Camera dept: named position phrases only.
           case when txt ~* '\y(camera\s+operator|steadicam\s+operator|1st\s+ac\y|first\s+assistant\s+camera|2nd\s+ac\y|second\s+assistant\s+camera|director\s+of\s+photography|cinematograph(er|y)|dp\s+(needed|wanted|hire|position)|\bdop\b\s+(needed|wanted|hire|position)|camera\s+(department|dept)|camera\s+pa\y|dit\s+(needed|wanted|hire|position)|digital\s+imaging\s+technician)'
                then 'camera' end,

           -- Grip & Electric: named crew positions only.
           case when txt ~* '\y(key\s+grip|best\s+boy\s+grip|dolly\s+grip|grip\s+(department|dept|crew|pa)|\bgaffer\y|best\s+boy\s+electric|set\s+electric(ian)?s?|electric\s+(department|dept|crew)|lighting\s+technician|rigging\s+(grip|electric)|swing\s+gang)'
                then 'grip_electric' end,

           -- Sound dept: named sound crew positions.
           case when txt ~* '\y(sound\s+mixer|production\s+sound|boom\s+operator|utility\s+sound|sound\s+utility|sound\s+(department|dept|crew|pa)|sound\s+recordist|a2\s+audio|audio\s+(engineer|technician))'
                then 'sound' end,

           -- Hair & Makeup: named crew positions (guard against on-camera hair/beard talk).
           case when txt ~* '\y(hair\s+(&|and)\s+makeup|hair\s+stylist|hair\s+(department|dept|artist)|makeup\s+artist|makeup\s+(department|dept)|\bmua\y|key\s+hair|key\s+makeup|hair\s+and\s+makeup\s+artist)'
                then 'hair_makeup' end,

           -- Wardrobe / costume: crew positions only.
           case when txt ~* '\y(wardrobe\s+(supervisor|assistant|department|dept|stylist|crew|pa)|costume\s+designer|costume\s+(department|dept|assistant|supervisor)|set\s+costumer|key\s+costumer)'
                then 'wardrobe' end,

           -- Art department: named crew positions.
           case when txt ~* '\y(art\s+(department|dept|director|assistant|pa)|set\s+dresser|set\s+decorator|prop\s+(master|assistant|department|dept)|scenic\s+(artist|painter)|production\s+designer|leadperson\y|leadman\y|construction\s+coordinator)'
                then 'art_department' end,

           -- Locations dept: named locations crew.
           case when txt ~* '\y(location\s+(scout|manager|assistant|coordinator|department|dept)|assistant\s+location\s+manager|location\s+pa)'
                then 'locations' end,

           -- Production assistant: exact phrases only. "\bPA\b" alone is banned.
           case when txt ~* '\y(production\s+assistant|set\s+pa|office\s+pa|art\s+pa|camera\s+pa|wardrobe\s+pa|location\s+pa|first\s+team\s+pa|second\s+team\s+pa)'
                then 'production_assistant' end
         ], null) as families
    from corpus
)
update public.opportunities o
   set role_families = m.families
  from matched m
 where o.id = m.id
   and cardinality(coalesce(m.families, '{}')) > 0
   and cardinality(o.role_families) = 0;
