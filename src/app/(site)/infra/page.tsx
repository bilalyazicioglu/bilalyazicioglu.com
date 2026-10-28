import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ManSection } from "@/components/Man";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Infra",
  description: "Normally hosted in my homelab, temporarily served from Cloudflare Workers.",
  alternates: { canonical: `${siteConfig.url}/infra` },
};

export default function InfraPage() {
  return (
    <div className="font-ui text-[15px] leading-[1.75]">
      <PageHeader name="infra" section={8} kind="System Administration" summary="temporarily running on Cloudflare">
        <p>
          This site normally runs in Docker on a small server in my homelab in Istanbul.
          When the home internet outage lasted over an hour, I moved it to Cloudflare Workers
          temporarily to keep the portfolio, projects and blog available.
        </p>
      </PageHeader>
      <ManSection title="HOW THIS REACHED YOU">
        <p className="max-w-[64ch]">
          The pages are generated from the Git repository at build time and served as static
          assets from Cloudflare. This deployment does not depend on the home connection.
        </p>
      </ManSection>
      <ManSection title="HOMELAB METRICS">
        <p className="max-w-[64ch]">
          The live dashboard normally reads from Prometheus on the homeserver. Those metrics
          are unavailable here. I plan to move the site back once the home connection is stable.
        </p>
      </ManSection>
    </div>
  );
}
