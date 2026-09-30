import { TincanPage, tincanMetadata } from "@/components/tincan/TincanPage";

export const revalidate = 3600;
export const metadata = tincanMetadata("en");

export default function Page() {
  return <TincanPage lang="en" />;
}
