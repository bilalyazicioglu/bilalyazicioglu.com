import { DeliveryStatus } from "@/components/infra/DeliveryStatus";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ManSection } from "@/components/Man";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Infra",
  description: "Homeserver operation, release identity and the Cloudflare static fallback.",
  alternates: { canonical: `${siteConfig.url}/infra` },
};

export default function InfraPage() {
  return (
    <div className="font-ui text-[15px] leading-[1.75]">
      <PageHeader name="infra" section={8} kind="System Administration" summary="homeserver with a static fallback">
        <p>
          This site normally runs in Docker on a small server in my homelab in Istanbul.
          A home internet outage lasting over an hour led me to add a Cloudflare Workers static fallback.
          Requests normally go to the homeserver; failures are served from a published snapshot.
        </p>
      </PageHeader>
      <DeliveryStatus />

      <ManSection title="HOW THIS REACHED YOU">
        <p className="max-w-[64ch]">
          The pages are generated from the Git repository at build time and served as static
          assets from Cloudflare. This deployment does not depend on the home connection.
        </p>
      </ManSection>
      <ManSection title="HOMELAB METRICS">
        <p className="max-w-[64ch]">
          The live dashboard normally reads from Prometheus on the homeserver. Those metrics
          are unavailable here. The backend reading above shows where the current status request was served.
        </p>
      </ManSection>
    </div>
  );
}
