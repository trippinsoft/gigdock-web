import type { Metadata } from "next";
import FeedbackForm from "@/components/app/FeedbackForm";

export const metadata: Metadata = {
  title: "Help & feedback",
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return <FeedbackForm />;
}
