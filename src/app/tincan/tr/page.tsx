import { TincanPage, tincanMetadata } from "@/components/tincan/TincanPage";

export const revalidate = 3600;
export const metadata = tincanMetadata("tr");

export default function Page() {
  return <TincanPage lang="tr" />;
}
