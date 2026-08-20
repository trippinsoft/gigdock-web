# GigDock analytics event dictionary

One Amplitude project receives events from **both** surfaces — the website
(`gigdock-web`) and the mobile app (`gigvault`, built in Draftbit) — so the whole
funnel lives in one place: discover on the web → track in the app.

- **Amplitude project:** same ingestion key on both surfaces. On the web it's read
  from `NEXT_PUBLIC_AMPLITUDE_API_KEY`; in the app it's the key in
  `apis/AmplitudeApi.js`. Point both at the same project so events unify.
- **Identity:** when a user is signed in, both surfaces send Amplitude `user_id` =
  the Supabase auth user id, so one person's web + app activity ties together.
  Anonymous web visitors get an Amplitude `device_id` automatically.
- **Naming:** `snake_case` event names, `snake_case` properties.
- **Common property on every event:** `platform` = `web` | `ios` | `android`.

## Web events (`gigdock-web`)

| Event | When | Key properties |
|---|---|---|
| `[Amplitude] Page Viewed` | Any page load (autocapture) | url, referrer (automatic) |
| `[Amplitude] Session Start/End` | Session boundaries (autocapture) | — |
| `opportunity_list_viewed` | A market landing page renders (`/opportunities/<market>`) | `market`, `results_count`, `roles`, `sources`, `surface: "market_page"` |
| `opportunity_viewed` | A shared gig link opens (`/opportunities/<uuid>`) | `opportunity_id`, `production_name`, `market`, `source`, `pay_min`, `surface: "shared_link"` |
| `opportunity_shared` | A share channel is chosen | `opportunity_id`, `method` (`copy_link` \| `email` \| `sms` \| `whatsapp`) |
| `opportunity_applied` | The Apply CTA is clicked on the public feed | `opportunity_id`, `production_name`, `market`, `source`, `pay_min`, `method` (`email` \| `url`), `apply_host` |

## App events (`gigvault`) — existing

These already fire from the app. Keeping the names as-is; the only uniformity
change is adding `platform` (and, where cheap, an id property) to each.

| Event | When | Notes |
|---|---|---|
| `app_opened` | App launch | add `platform` |
| `gig_tapped` | A gig row is opened | add `platform`, `gig_id` |
| `gig_created` | A gig is saved | add `platform`, `gig_id` |
| `payment_added` | A payment is recorded | add `platform`, `gig_id` |
| `payment_updated` | A payment is edited | add `platform`, `gig_id` |
| `hours_entered_on_day` | Hours entered for a work day | add `platform` |
| `hours_entered_screen` | Hours-entry screen opened | add `platform` |
| `day_location_entered` | A day's location is entered | add `platform` |

## Funnel this enables

`opportunity_list_viewed` → `opportunity_viewed` → `opportunity_applied`
(web discovery) → `gig_created` → `payment_added` (app tracking). Split any of
these by `platform` to compare web vs iOS vs Android, or by `market`/`source` to
see which feeds and cities convert.

## Optional next events (add when the UI exists)

- `opportunity_saved` — if/when the web or app lets a user save a casting call to
  track later (in the app today, saving a gig to track = `gig_created`).
- `search_performed` — `{ query, results_count }` on the opportunities search.
- `gigfit_viewed` — `{ opportunity_id, verdict }` when a match score is shown.
