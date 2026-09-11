import type { Metadata } from "next";
import { getDocuments, getSignedDocUrls, getUserGigsForPicker } from "@/lib/backoffice";
import DocumentsLibrary from "@/components/app/DocumentsLibrary";
import { parseTypesQuery, parseYearQuery } from "@/lib/documentTypes";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ types?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const [docs, gigs] = await Promise.all([getDocuments(), getUserGigsForPicker()]);
  const urls = await getSignedDocUrls(docs.map((d) => d.storage_path));
  const withUrls = docs.map((d) => ({ ...d, url: urls[d.storage_path] }));
  return (
    <DocumentsLibrary
      docs={withUrls}
      gigs={gigs}
      initialTypes={parseTypesQuery(sp.types)}
      initialYear={parseYearQuery(sp.year)}
    />
  );
}
