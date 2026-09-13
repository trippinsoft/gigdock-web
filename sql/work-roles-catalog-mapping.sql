-- ============================================================================
-- work_roles_catalog → opportunity mapping (Phase B, additive)
--
-- Adds two mapping columns to public.work_roles_catalog so each USER role
-- carries the opportunity-side signals it should match against:
--
--   opportunity_work_types   — text[] of casting_specs.work_type enum values
--                              (already used by the extractor)
--   opportunity_role_families — text[] of the coarse role-family keys stored
--                              on opportunities.role_families (Phase B sibling)
--
-- The two dimensions cover both existing performer classification
-- (casting_specs.work_type: background/featured/stand-in/photo-double/
-- principal/voice-over/live-music/brand-ambassador/model/other) AND the
-- new crew role-family classification (production_assistant, camera,
-- grip_electric, sound, hair_makeup, wardrobe, art_department, locations).
--
-- Matching is tri-state at query time:
--   MATCH    — opportunity's structured work_type ∈ user_work_types
--              OR opportunity's role_families ∩ user_role_families is non-empty
--   MISMATCH — opportunity has explicit structured classification and it does
--              NOT overlap the user's role targets
--   UNKNOWN  — opportunity has NO usable structured role classification
--              (never counted as a mismatch)
--
-- Absence of data on either side degrades to UNKNOWN — never to MISMATCH.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

alter table public.work_roles_catalog
  add column if not exists opportunity_work_types    text[] not null default '{}'::text[],
  add column if not exists opportunity_role_families text[] not null default '{}'::text[];

-- Seed / upsert the 14 role-key → opportunity mappings.
-- Performer keys map to casting_specs.work_type enum values.
-- Crew keys map to role_families keys.
-- "other" carries no mapping — it never adds a role signal and never blocks
-- (universal market signal still applies).
insert into public.work_roles_catalog
  (role_key, label, category, is_performer, sort_order, opportunity_work_types, opportunity_role_families)
values
  ('background_actor',      'Background Actor',        'performing', true,  100, array['background'],                           array[]::text[]),
  ('stand_in_photo_double', 'Stand-In / Photo Double', 'performing', true,  200, array['stand-in','photo-double'],              array[]::text[]),
  ('actor',                 'Actor',                   'performing', true,  300, array['principal','featured'],                 array[]::text[]),
  ('voice_actor',           'Voice Actor',             'performing', true,  400, array['voice-over'],                           array[]::text[]),
  ('model',                 'Model',                   'performing', true,  500, array['model','brand-ambassador'],             array[]::text[]),
  ('production_assistant',  'Production Assistant',    'crew',       false, 1000, array[]::text[],                              array['production_assistant']),
  ('camera',                'Camera',                  'crew',       false, 1100, array[]::text[],                              array['camera']),
  ('grip_electric',         'Grip & Electric',         'crew',       false, 1200, array[]::text[],                              array['grip_electric']),
  ('sound',                 'Sound',                   'crew',       false, 1300, array[]::text[],                              array['sound']),
  ('hair_makeup',           'Hair & Makeup',           'crew',       false, 1400, array[]::text[],                              array['hair_makeup']),
  ('wardrobe',              'Wardrobe',                'crew',       false, 1500, array[]::text[],                              array['wardrobe']),
  ('art_department',        'Art Department',          'crew',       false, 1600, array[]::text[],                              array['art_department']),
  ('locations',             'Locations',               'crew',       false, 1700, array[]::text[],                              array['locations']),
  ('other',                 'Other',                   'other',      false, 9999, array[]::text[],                              array[]::text[])
on conflict (role_key) do update
  set label                     = excluded.label,
      category                  = excluded.category,
      is_performer              = excluded.is_performer,
      sort_order                = excluded.sort_order,
      opportunity_work_types    = excluded.opportunity_work_types,
      opportunity_role_families = excluded.opportunity_role_families,
      updated_at                = now();
