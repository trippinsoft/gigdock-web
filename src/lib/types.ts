export interface Opportunity {
  id: string;
  title: string;
  summary: string | null;
  location: string | null;
  work_date: string | null;
  source: string | null;
  source_type: string;
  status: "draft" | "active" | "expired" | "hidden";
  pay_rate: string | null;
  pay_bumps: string | null;
  requirements: string | null;
  casting_specs: CastingSpecs | null;
  apply_by: string | null;
  application_info: string | null;
  link: string | null;
  notes: string | null;
  type: string | null;
  posted_at: string;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  dedup_fingerprint: string | null;
  author_user_id: string | null;
  image_url: string | null;
}

export interface CastingSpecs {
  gender?: string;
  age_min?: number;
  age_max?: number;
  ethnicity?: string;
  vehicle?: string;
  skills?: string;
  union_status?: string;
}

export interface RawIngestion {
  id: string;
  source_id: string | null;
  source_type: string;
  source_name: string | null;
  external_id: string | null;
  original_url: string | null;
  raw_text: string;
  published_at: string | null;
  status: "pending" | "processed" | "duplicate" | "error" | "discarded";
  error_detail: string | null;
  opportunity_id: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface Source {
  id: string;
  type: string;
  name: string;
  url: string | null;
  active: boolean;
  last_polled_at: string | null;
  last_item_at: string | null;
  created_at: string;
}

export interface OpportunityEdit {
  id: string;
  opportunity_id: string;
  edited_by: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  edited_at: string;
}

export type AdminTab =
  | "review"
  | "active"
  | "discards"
  | "duplicates"
  | "sources"
  | "hidden";
