import { TincanPage, tincanMetadata } from "@/components/tincan/TincanPage";

export const dynamic = "force-dynamic";
export const metadata = tincanMetadata("tr");

export default function Page() {
  return <TincanPage lang="tr" />;
}
