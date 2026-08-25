import type { Metadata } from "next";
import { getDocuments, getSignedDocUrls } from "@/lib/backoffice";
import DocumentsLibrary from "@/components/app/DocumentsLibrary";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};

export default async function DocumentsPage() {
  const docs = await getDocuments();
  const urls = await getSignedDocUrls(docs.map((d) => d.storage_path));
  const withUrls = docs.map((d) => ({ ...d, url: urls[d.storage_path] }));
  return <DocumentsLibrary docs={withUrls} />;
}
