import type { Metadata } from "next";
import PublicShell from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Delete Your GigDock Account",
  description:
    "How to request deletion of your GigDock account and associated data, what is deleted, and how long it takes.",
  alternates: { canonical: "/delete-account" },
  robots: { index: true, follow: true },
};

const SUPPORT_EMAIL = "gigdocksupport@gmail.com";

export default function DeleteAccountPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl py-4 text-zinc-800 dark:text-zinc-200">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Delete your GigDock account
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          This page explains how to request deletion of your <strong>GigDock</strong> account
          (the GigDock app by GigDock) and the data associated with it.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            How to request deletion
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Email us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              from the email address on your GigDock account.
            </li>
            <li>
              Use the subject line <strong>&quot;Delete my account&quot;</strong> so we can find your request quickly.
            </li>
            <li>
              We&apos;ll confirm and permanently delete your account and profile data (see below).
              No further action is needed from you.
            </li>
          </ol>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            A self-service <strong>Delete Account</strong> option is also being added inside the GigDock
            app (Settings → Delete Account).
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            What gets deleted
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Your account and login (email address and authentication).</li>
            <li>
              Your GigFit profile(s) — including name, date of birth, gender, ethnicity, height,
              regions/markets, and union status.
            </li>
            <li>Your saved and applied opportunity lists.</li>
            <li>Any feedback or support messages you submitted that are tied to your account.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            What is kept, and for how long
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Your account and profile data are permanently deleted within <strong>30 days</strong> of
              your request.
            </li>
            <li>
              Copies in encrypted backups are purged within <strong>90 days</strong>.
            </li>
            <li>
              We keep <strong>no personally identifying information</strong> after that, except where we
              are required to retain limited records to comply with legal obligations.
            </li>
            <li>
              Casting listings shown in GigDock are aggregated from public sources and are{" "}
              <strong>not your personal data</strong>; they are not affected by deleting your account.
            </li>
          </ul>
        </section>

        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          Questions about your data? Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </PublicShell>
  );
}
