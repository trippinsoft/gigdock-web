-- Re-examine drafts that were wrongly held for "No way to apply" -------------
-- auto-activate only looks at drafts where review_reason IS NULL, so anything
-- already held won't be reconsidered. After you DEPLOY the fixed auto-activate
-- (which now scans summary + requirements for an email/URL), run this to clear
-- the reason on those drafts so the next auto-activate run re-evaluates them
-- with the corrected logic.
--
-- ORDER MATTERS: deploy the fixed function FIRST, then run this. Otherwise the
-- old logic just re-holds them the same way.
--
-- Safe because review_reason is only ever set by auto-activate (never by a human
-- action — Approve/Reject change status instead). We only touch drafts whose
-- reason mentions the apply check.

update public.opportunities
set review_reason = null
where status = 'draft'
  and deleted_at is null
  and review_reason ilike '%No way to apply%';

-- Next auto-activate run will: activate email/URL-apply gigs from trusted
-- sources, and re-hold the rest for their real reasons (still no apply target,
-- source not trusted, etc.).
