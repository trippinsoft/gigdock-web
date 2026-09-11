"use server";

// Server actions for the web back-office write path. Each runs under the
// caller's Supabase session (RLS scopes writes to the owner), and mirrors the
// mobile app's exact write contract against the shared tables. The database
// stays the source of truth for earnings — we store raw inputs (and, for
// cross-client parity with the mobile app, the same derived gross_pay/base_pay
// the app stores) but never rely on those stored values for display.

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase-server";
import { dayGrossEarned, type PayType } from "@/lib/pay";
import { isDocumentType } from "@/lib/documentTypes";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function client() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/* ── Gig-level ───────────────────────────────────────────────────────────── */

/** Create a blank draft gig (active=false), returning its id. Mirrors the
 * mobile app's "add new gig" which creates a draft then opens the editor. */
export async function createDraftGig(): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await client();
    const { data, error } = await supabase
      .from("gigs")
      .insert({
        user_id: user.id,
        title: "",
        short_code: null,
        rate: null,
        location: null,
        notes: null,
        active: false,
        status_overall: "booked",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export interface GigFields {
  title: string;
  location: string | null;
  notes: string | null;
  status_overall: string; // availability_checked | booked | worked | paid
  pay_type: PayType | null;
  pay_minimum_amount: number | null;
  pay_minimum_hours: number | null;
  pay_hourly_rate: number | null;
  pay_flat_rate: number | null;
  ot_multiplier: number | null;
  bump_rate: number | null;
  is_unpaid: boolean;
  gig_company_id: string | null;
  payroll_company_id: string | null;
  project_id: string | null;
}

/** Save gig-level fields and finalize (active=true) once it has a title. */
export async function saveGig(
  id: string,
  fields: GigFields
): Promise<ActionResult> {
  try {
    const { supabase } = await client();
    const title = fields.title.trim();
    if (!title) return { ok: false, error: "A title is required." };
    const { error } = await supabase
      .from("gigs")
      .update({
        title,
        location: fields.location,
        notes: fields.notes,
        status_overall: fields.status_overall,
        pay_type: fields.pay_type,
        pay_minimum_amount: fields.pay_minimum_amount,
        pay_minimum_hours: fields.pay_minimum_hours,
        pay_hourly_rate: fields.pay_hourly_rate,
        pay_flat_rate: fields.pay_flat_rate,
        ot_multiplier: fields.ot_multiplier,
        bump_rate: fields.bump_rate,
        pay_currency: "USD",
        is_unpaid: fields.is_unpaid,
        gig_company_id: fields.gig_company_id,
        payroll_company_id: fields.payroll_company_id,
        project_id: fields.project_id,
        active: true,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/gigs");
    revalidatePath(`/gigs/${id}`);
    revalidatePath(`/gigs/${id}/edit`);
    revalidatePath("/today");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Soft-delete a real (titled) gig via the RPC (keeps documents as personal). */
export async function deleteGig(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await client();
    const { error } = await supabase.rpc("soft_delete_gig", { p_gig_id: id });
    if (error) throw error;
    revalidatePath("/gigs");
    revalidatePath("/today");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Hard-delete an untitled empty draft via the RPC (used when discarding). */
export async function discardDraftGig(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await client();
    const { error } = await supabase.rpc("delete_draft_gig", { p_gig_id: id });
    if (error) throw error;
    revalidatePath("/gigs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/* ── Companies & projects (quick create) ─────────────────────────────────── */

/** Create a company. kind: 'gig' (production/hiring) or 'payroll'. Returns it
 * so the caller can select it immediately. Mirrors the app's addCompany. */
export async function createCompany(
  name: string,
  kind: "gig" | "payroll"
): Promise<ActionResult<{ id: string; name: string; kind: string }>> {
  try {
    const { supabase, user } = await client();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Enter a name." };
    const { data, error } = await supabase
      .from("companies")
      .insert({ user_id: user.id, name: trimmed, kind })
      .select("id, name, kind")
      .single();
    if (error) throw error;
    return { ok: true, data: data as { id: string; name: string; kind: string } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Create a project (title only; other fields are optional and app-editable). */
export async function createProject(
  title: string
): Promise<ActionResult<{ id: string; title: string }>> {
  try {
    const { supabase, user } = await client();
    const trimmed = title.trim();
    if (!trimmed) return { ok: false, error: "Enter a title." };
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, title: trimmed })
      .select("id, title")
      .single();
    if (error) throw error;
    return { ok: true, data: data as { id: string; title: string } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/* ── Gig days ────────────────────────────────────────────────────────────── */

export interface GigDateFields {
  id?: string; // present = update
  gig_id: string;
  date: string; // YYYY-MM-DD
  status_for_day: string; // availability_checked | booked | worked | paid
  hours_total: number;
  hours_lunch: number;
  overtime_hours: number;
  bumps: number;
  base_pay_applies: boolean;
  notes: string | null;
}

/** Insert or update a worked/scheduled day. Stores raw inputs plus, for parity
 * with the mobile app, the derived base_pay/gross_pay computed from the gig's
 * pay model with the same formula the database uses. */
export async function saveGigDate(f: GigDateFields): Promise<ActionResult> {
  try {
    const { supabase, user } = await client();

    // Pull the gig's pay model so stored gross/base match the mobile app.
    const { data: gig, error: gigErr } = await supabase
      .from("gigs")
      .select("pay_type, pay_minimum_amount, pay_minimum_hours, pay_hourly_rate, ot_starts_after_hours, ot_multiplier")
      .eq("id", f.gig_id)
      .single();
    if (gigErr) throw gigErr;

    const base = dayGrossEarned({
      payType: (gig.pay_type as PayType | null) ?? null,
      hoursTotal: f.hours_total,
      payMinimumAmount: Number(gig.pay_minimum_amount ?? 0),
      payMinimumHours: Number(gig.pay_minimum_hours ?? 0),
      payHourlyRate: Number(gig.pay_hourly_rate ?? 0),
      otStartsAfterHours: Number(gig.ot_starts_after_hours ?? 0),
      otMultiplier: Number(gig.ot_multiplier ?? 1),
      bumps: 0,
    });
    const applies = f.base_pay_applies;
    const basePay = applies ? base : 0;
    const grossPay = basePay + (f.bumps || 0);

    const row = {
      gig_id: f.gig_id,
      date: f.date,
      status_for_day: f.status_for_day,
      hours_total: f.hours_total,
      hours_lunch: f.hours_lunch,
      overtime_hours: f.overtime_hours,
      bumps: f.bumps,
      base_pay: basePay,
      gross_pay: grossPay,
      base_pay_applies: applies,
      notes: f.notes,
    };

    if (f.id) {
      const { error } = await supabase.from("gig_dates").update(row).eq("id", f.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("gig_dates")
        .insert({ ...row, user_id: user.id });
      if (error) throw error;
    }
    revalidatePath(`/gigs/${f.gig_id}`);
    revalidatePath(`/gigs/${f.gig_id}/edit`);
    revalidatePath("/gigs");
    revalidatePath("/calendar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Soft-delete a day (its bumps cascade via trigger). */
export async function deleteGigDate(
  id: string,
  gigId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await client();
    const { error } = await supabase
      .from("gig_dates")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/gigs/${gigId}`);
    revalidatePath(`/gigs/${gigId}/edit`);
    revalidatePath("/calendar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export type CalendarDayPatch = {
  status_for_day: string | null;
  hours_total: number | null;
  day_earned: number | null;
  gross_earned: number | null;
  total_paid: number | null;
  remaining: number | null;
  received_percent: number | null;
};

/** Patch one calendar day's status and/or hours (same tables as mobile
 * updateSelectedDayStatus / UpdateGigDate). Recomputes stored gross for
 * mobile parity, then returns load_gig_date_with_earnings + load_gig_earnings_summary. */
export async function patchCalendarDay(opts: {
  gigDateId: string;
  gigId: string;
  status_for_day?: string;
  hours_total?: number;
}): Promise<ActionResult<CalendarDayPatch>> {
  try {
    const { supabase } = await client();

    const { data: existing, error: existErr } = await supabase
      .from("gig_dates")
      .select("id, gig_id, hours_total, bumps, base_pay_applies, status_for_day")
      .eq("id", opts.gigDateId)
      .is("deleted_at", null)
      .maybeSingle();
    if (existErr) throw existErr;
    if (!existing || existing.gig_id !== opts.gigId) {
      return { ok: false, error: "That day could not be found." };
    }

    const { data: gig, error: gigErr } = await supabase
      .from("gigs")
      .select("pay_type, pay_minimum_amount, pay_minimum_hours, pay_hourly_rate, ot_starts_after_hours, ot_multiplier")
      .eq("id", opts.gigId)
      .single();
    if (gigErr) throw gigErr;

    const hours = opts.hours_total ?? Number(existing.hours_total ?? 0);
    const status = opts.status_for_day ?? existing.status_for_day ?? "worked";
    const bumps = Number(existing.bumps ?? 0);
    const applies = existing.base_pay_applies ?? true;

    const base = dayGrossEarned({
      payType: (gig.pay_type as PayType | null) ?? null,
      hoursTotal: hours,
      payMinimumAmount: Number(gig.pay_minimum_amount ?? 0),
      payMinimumHours: Number(gig.pay_minimum_hours ?? 0),
      payHourlyRate: Number(gig.pay_hourly_rate ?? 0),
      otStartsAfterHours: Number(gig.ot_starts_after_hours ?? 0),
      otMultiplier: Number(gig.ot_multiplier ?? 1),
      bumps: 0,
    });
    const basePay = applies ? base : 0;
    const grossPay = basePay + bumps;

    const { error: updErr } = await supabase
      .from("gig_dates")
      .update({
        status_for_day: status,
        hours_total: hours,
        base_pay: basePay,
        gross_pay: grossPay,
      })
      .eq("id", opts.gigDateId);
    if (updErr) throw updErr;

    const { data: dayRow, error: dayErr } = await supabase.rpc("load_gig_date_with_earnings", {
      p_gig_date_id: opts.gigDateId,
    });
    if (dayErr) throw dayErr;
    const day = (Array.isArray(dayRow) ? dayRow[0] : dayRow) as {
      gross_earned_calc?: number | null;
      hours_total?: number | null;
    } | null;

    const { data: sumRow, error: sumErr } = await supabase.rpc("load_gig_earnings_summary", {
      p_gig_id: opts.gigId,
    });
    if (sumErr) throw sumErr;
    const sum = (Array.isArray(sumRow) ? sumRow[0] : sumRow) as {
      gross_earned?: number | null;
      total_paid?: number | null;
      remaining?: number | null;
      received_percent?: number | null;
    } | null;

    revalidatePath("/calendar");
    revalidatePath(`/gigs/${opts.gigId}`);
    revalidatePath("/today");

    return {
      ok: true,
      data: {
        status_for_day: status,
        hours_total: day?.hours_total ?? hours,
        day_earned: day?.gross_earned_calc ?? null,
        gross_earned: sum?.gross_earned ?? null,
        total_paid: sum?.total_paid ?? null,
        remaining: sum?.remaining ?? null,
        received_percent: sum?.received_percent ?? null,
      },
    };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Refresh day earned + gig payment summary without writing (open inspector). */
export async function loadCalendarDaySheet(opts: {
  gigDateId: string;
  gigId: string;
}): Promise<ActionResult<CalendarDayPatch>> {
  try {
    const { supabase } = await client();
    const { data: existing, error: existErr } = await supabase
      .from("gig_dates")
      .select("status_for_day, hours_total, gig_id")
      .eq("id", opts.gigDateId)
      .is("deleted_at", null)
      .maybeSingle();
    if (existErr) throw existErr;
    if (!existing || existing.gig_id !== opts.gigId) {
      return { ok: false, error: "That day could not be found." };
    }

    const { data: dayRow, error: dayErr } = await supabase.rpc("load_gig_date_with_earnings", {
      p_gig_date_id: opts.gigDateId,
    });
    if (dayErr) throw dayErr;
    const day = (Array.isArray(dayRow) ? dayRow[0] : dayRow) as { gross_earned_calc?: number | null } | null;

    const { data: sumRow, error: sumErr } = await supabase.rpc("load_gig_earnings_summary", {
      p_gig_id: opts.gigId,
    });
    if (sumErr) throw sumErr;
    const sum = (Array.isArray(sumRow) ? sumRow[0] : sumRow) as {
      gross_earned?: number | null;
      total_paid?: number | null;
      remaining?: number | null;
      received_percent?: number | null;
    } | null;

    return {
      ok: true,
      data: {
        status_for_day: existing.status_for_day,
        hours_total: existing.hours_total,
        day_earned: day?.gross_earned_calc ?? null,
        gross_earned: sum?.gross_earned ?? null,
        total_paid: sum?.total_paid ?? null,
        remaining: sum?.remaining ?? null,
        received_percent: sum?.received_percent ?? null,
      },
    };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/* ── Payments ────────────────────────────────────────────────────────────── */

export interface PaymentFields {
  id?: string;
  gig_id: string;
  pay_date: string;
  gross_pay: number | null;
  net_pay: number | null;
  /** Optional. The web editor no longer captures this — omit to preserve
   *  any existing DB value on update rather than clearing it. */
  hours_paid?: number | null;
  payment_method: string | null;
  notes: string | null;
}

export async function savePayment(f: PaymentFields): Promise<ActionResult> {
  try {
    const { supabase, user } = await client();
    const row: Record<string, unknown> = {
      gig_id: f.gig_id,
      pay_date: f.pay_date,
      gross_pay: f.gross_pay,
      net_pay: f.net_pay,
      payment_method: f.payment_method,
      notes: f.notes,
    };
    if (f.hours_paid !== undefined) row.hours_paid = f.hours_paid;
    if (f.id) {
      const { error } = await supabase.from("gig_payments").update(row).eq("id", f.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("gig_payments")
        .insert({ ...row, user_id: user.id });
      if (error) throw error;
    }
    revalidatePath(`/gigs/${f.gig_id}`);
    revalidatePath(`/gigs/${f.gig_id}/edit`);
    revalidatePath("/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function deletePayment(
  id: string,
  gigId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await client();
    const { error } = await supabase
      .from("gig_payments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/gigs/${gigId}`);
    revalidatePath(`/gigs/${gigId}/edit`);
    revalidatePath("/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Rename a document, change its type/date/notes. Gig linking lives in a
 * separate action (updateDocumentGig) because it is Pro-gated and mobile
 * exposes it through its own picker screen, not the general edit form. */
export async function updateDocumentMeta(
  id: string,
  fields: {
    display_name: string;
    document_type: string;
    /** ISO YYYY-MM-DD or null to clear. Undefined = leave unchanged. */
    document_date?: string | null;
    /** Free text; null clears, undefined leaves unchanged. */
    notes?: string | null;
  }
): Promise<ActionResult> {
  try {
    const { supabase } = await client();
    const name = fields.display_name.trim();
    if (name.length < 1 || name.length > 160) {
      return { ok: false, error: "Name must be between 1 and 160 characters." };
    }
    if (!isDocumentType(fields.document_type)) {
      return { ok: false, error: "Choose a valid document type." };
    }
    if (
      fields.document_date != null &&
      fields.document_date !== "" &&
      !/^\d{4}-\d{2}-\d{2}$/.test(fields.document_date)
    ) {
      return { ok: false, error: "Enter the date as YYYY-MM-DD." };
    }
    const patch: Record<string, unknown> = {
      display_name: name,
      document_type: fields.document_type,
      updated_at: new Date().toISOString(),
    };
    if (fields.document_date !== undefined) {
      patch.document_date = fields.document_date === "" ? null : fields.document_date;
    }
    if (fields.notes !== undefined) {
      const trimmed = fields.notes?.trim() ?? "";
      patch.notes = trimmed === "" ? null : trimmed;
    }
    const { error } = await supabase
      .from("documents")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
    revalidatePath("/documents");
    revalidatePath("/tax-ready");
    revalidatePath("/reports/taxReady");
    revalidatePath("/reports/documents");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Insert a documents row for a file the browser client just uploaded to
 * Storage. Mirrors the mobile insert exactly (same columns, no rpc). The
 * storage_path must live under the user's own prefix — belt-and-braces on top
 * of Storage RLS. Setting a gig_id requires the caller be Pro; a Free user's
 * gig_id is silently coerced to null so the upload still succeeds (matches the
 * mobile flow: keep the document, offer the Pro upsell afterward). */
export async function createDocument(fields: {
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  display_name: string;
  document_type: string;
  document_date: string | null;
  notes: string | null;
  gig_id: string | null;
}): Promise<
  ActionResult<{ id: string; gig_id: string | null; storage_path: string }>
> {
  try {
    const { supabase, user } = await client();
    const name = fields.display_name.trim();
    if (name.length < 1 || name.length > 160) {
      return { ok: false, error: "Name must be between 1 and 160 characters." };
    }
    if (!isDocumentType(fields.document_type)) {
      return { ok: false, error: "Choose a valid document type." };
    }
    if (
      fields.document_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(fields.document_date)
    ) {
      return { ok: false, error: "Enter the date as YYYY-MM-DD." };
    }
    if (!fields.storage_path.startsWith(`${user.id}/`)) {
      return { ok: false, error: "That upload could not be saved." };
    }

    // Pro gating: Free users may still create the record; the gig association
    // is dropped. Matches mobile AddDocumentScreen behavior.
    let gigId: string | null = fields.gig_id;
    if (gigId) {
      const { data: pro } = await supabase.rpc("has_active_entitlement", {
        p_product: "pro",
      });
      if (!pro) gigId = null;
      else {
        const { data: gig, error: gigErr } = await supabase
          .from("gigs")
          .select("id")
          .eq("id", gigId)
          .is("deleted_at", null)
          .maybeSingle();
        if (gigErr) throw gigErr;
        if (!gig) return { ok: false, error: "That gig could not be found." };
      }
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        gig_id: gigId,
        document_type: fields.document_type,
        display_name: name,
        storage_path: fields.storage_path,
        original_file_name: fields.original_file_name,
        mime_type: fields.mime_type,
        file_size: fields.file_size,
        document_date: fields.document_date,
        notes: fields.notes?.trim() || null,
      })
      .select("id, gig_id, storage_path")
      .single();
    if (error) throw error;
    revalidatePath("/documents");
    revalidatePath("/tax-ready");
    revalidatePath("/reports/taxReady");
    revalidatePath("/reports/documents");
    if (gigId) revalidatePath(`/gigs/${gigId}`);
    return {
      ok: true,
      data: {
        id: data.id as string,
        gig_id: (data.gig_id as string | null) ?? null,
        storage_path: data.storage_path as string,
      },
    };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Change a document's gig association. Pass null to detach ("Personal
 * Documents" in mobile). Pro-gated because gig linking is Pro. */
export async function updateDocumentGig(
  id: string,
  gigId: string | null
): Promise<ActionResult<{ gig_id: string | null; previous_gig_id: string | null }>> {
  try {
    const { supabase } = await client();
    const { data: pro } = await supabase.rpc("has_active_entitlement", {
      p_product: "pro",
    });
    if (!pro) return { ok: false, error: "Connecting documents to gigs is a Pro feature." };

    const { data: existing, error: readErr } = await supabase
      .from("documents")
      .select("gig_id")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) return { ok: false, error: "That document could not be found." };

    if (gigId) {
      const { data: gig, error: gigErr } = await supabase
        .from("gigs")
        .select("id")
        .eq("id", gigId)
        .is("deleted_at", null)
        .maybeSingle();
      if (gigErr) throw gigErr;
      if (!gig) return { ok: false, error: "That gig could not be found." };
    }

    const { error } = await supabase
      .from("documents")
      .update({ gig_id: gigId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;

    const previousGigId = (existing.gig_id as string | null) ?? null;
    revalidatePath("/documents");
    if (previousGigId) revalidatePath(`/gigs/${previousGigId}`);
    if (gigId) revalidatePath(`/gigs/${gigId}`);
    return { ok: true, data: { gig_id: gigId, previous_gig_id: previousGigId } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Delete a document. Matches mobile: row is removed and the Storage object is
 * cleaned up too so the private bucket does not accumulate orphans. If the
 * Storage remove fails after the row is gone, the row deletion still wins —
 * the file becomes an orphan we can sweep later, same behavior as mobile. */
export async function deleteDocument(
  id: string
): Promise<ActionResult<{ storage_path: string; gig_id: string | null }>> {
  try {
    const { supabase } = await client();
    const { data: existing, error: readErr } = await supabase
      .from("documents")
      .select("id, storage_path, gig_id")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) return { ok: false, error: "That document could not be found." };

    const { error: delErr } = await supabase.from("documents").delete().eq("id", id);
    if (delErr) throw delErr;

    // Best-effort storage cleanup (matches mobile order: row first, then file).
    await supabase.storage
      .from("documents")
      .remove([existing.storage_path as string])
      .catch(() => undefined);

    revalidatePath("/documents");
    revalidatePath("/tax-ready");
    revalidatePath("/reports/taxReady");
    revalidatePath("/reports/documents");
    const gigId = (existing.gig_id as string | null) ?? null;
    if (gigId) revalidatePath(`/gigs/${gigId}`);
    return {
      ok: true,
      data: {
        storage_path: existing.storage_path as string,
        gig_id: gigId,
      },
    };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

function msg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong.";
}
