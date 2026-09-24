import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/PostEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni yazı",
  robots: { index: false, follow: false },
};

export default function NewPostPage() {
  return <PostEditor mode="new" />;
}
