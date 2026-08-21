// Single switch for the whole site's "get the app" story.
//
// While the app is in beta, every CTA (homepage, guides, opportunities pages, the
// /app landing page) invites people to JOIN THE BETA. At launch, flip APP_LIVE to
// true and fill in the store URLs — the same CTAs turn into App Store / Play Store
// download buttons everywhere, no other edits needed.

export const APP_LIVE = false;

// Fill these in at launch (leave "" for a store you haven't shipped to yet — its
// button is hidden automatically).
export const IOS_STORE_URL = "";
export const ANDROID_STORE_URL = "";

// Where the app landing page lives, and the in-page anchor for the beta form.
export const APP_PATH = "/app";
export const BETA_ANCHOR = "beta";
export const BETA_HREF = `${APP_PATH}#${BETA_ANCHOR}`;
