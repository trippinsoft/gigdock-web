// Amplitude event names for the Documents workspace. Mobile itself does not
// emit dedicated document_* events yet (only pro_feature_* around gig-link),
// so we introduce a small, opaque taxonomy here and never send document names
// or contents — only ids, types, and yes/no flags.

import { track } from "@/lib/analytics";

type DocEvent =
  | "document_upload_initiated"
  | "document_uploaded"
  | "document_upload_failed"
  | "document_deleted"
  | "document_connected_to_gig"
  | "document_gig_association_changed"
  | "document_disconnected_from_gig"
  | "document_metadata_updated";

export function trackDoc(event: DocEvent, props: Record<string, unknown> = {}) {
  track(event, props);
}
