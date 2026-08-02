# Talent search — competitive reference & schema direction

Captured from product discussion, not yet actioned. Reference for whoever picks up
agency-facing talent search next.

## Core insight

Everything built so far (`CastingCriteria`, GigFit, the Active tab filters) matches
**performers → gigs**. Agency talent search is the inverse: **agencies → performers**,
searching a database of `performer_profiles` by rich attributes. It's a distinct
feature, not an extension of job-post filtering — most job posts won't specify body
type/height/weight, but a performer's *profile* should still carry that data so an
agency can search the whole talent pool for something specific.

## Schema implication

`PerformerProfile` currently has: `markets`, `gender`, `date_of_birth`, `union_status`,
`work_types_wanted`, `pay_minimum`, `skills`, `vehicles`. No `ethnicity`, `body_type`,
`height`, or `weight`. Those need to exist on the profile regardless of whether any
gig ever filters on them — the profile is the searchable record for agencies.

**Controlled vocabularies, not free text.** For ethnicity and body type specifically,
filtering only stays viable if values are constrained to a fixed enum (same principle
already applied to `gender`/`union_status`/`work_type`). Height and weight are
numeric rather than enum-able — they'd need range filtering (e.g. `height_in`,
`weight_lb`) rather than a select list.

## Competitive reference: Project Casting's talent-search filters

Free filters: Gender, Skill, Ethnicity, Body type
Premium (crown-gated): Age, Followers, Credit, Weight, Height, Talent agency, Available asset

Note: GigDock currently exposes pay as a *free* filter chip on the Active tab —
opposite of Project Casting, where pay-adjacent filters are premium. Worth keeping in
mind if/when a tiering decision gets made; not decided yet.

### Ethnicity options

African American, American, Asian, Asian American, Biracial, Black, Caribbean,
Caucasian, Croatian, East Asian, European, Finnish, Hungarian, Indigenous Peoples,
Latino/Hispanic, Mexican, Middle Eastern, Multiracial, Polynesian, Romanian,
South Asian/Indian, Southeast Asian/Pacific Islander, White

### Body type options

Athletic, Average, Curvy, Fit, Heavyset, Muscular, Plus-Sized, Slim

## Open questions (not decided)

- Should ethnicity/body type be added as enums now, even before agency search exists,
  so `casting_specs` extraction and profile data are consistent from the start?
- Any tiering/paywall on GigDock filters, or is "everything free" the intended
  differentiator vs. Project Casting?
- Does agency talent search belong in the existing `/admin` shell or as a separate
  surface (agencies aren't performers)?
