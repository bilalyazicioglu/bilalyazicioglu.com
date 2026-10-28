import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader } from "@/components/PageHeader";
import { InfraDashboard } from "@/components/infra/InfraDashboard";
import { RequestPath } from "@/components/infra/RequestPath";
import { ManSection } from "@/components/Man";
import { cloudflareColo, getInfra } from "@/lib/infra";
import { siteConfig } from "@/site.config";
import { isVercelDeployment } from "@/lib/deployment";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Infra",
  description:
    "How this site is hosted, with live homelab metrics when available.",
  alternates: {
    canonical: `${siteConfig.url}/infra`,
  },
};

export default async function InfraPage() {
  if (isVercelDeployment()) {
    return (
      <div className="font-ui text-[15px] leading-[1.75]">
        <PageHeader name="infra" section={8} kind="System Administration" summary="temporarily running on Vercel">
          <p>
            This site normally runs in Docker on a small server in my homelab in Istanbul.
            When the home internet outage lasted over an hour, I moved it to Vercel temporarily
            to keep the portfolio, projects and blog available.
          </p>
        </PageHeader>
        <ManSection title="HOMELAB METRICS">
          <p className="max-w-[64ch]">
            The live dashboard reads from Prometheus on the homeserver. Those metrics are unavailable
            while the site is running here. I plan to move it back once the home connection is stable.
          </p>
        </ManSection>
      </div>
    );
  }
  const [data, requestHeaders] = await Promise.all([getInfra(), headers()]);
  const colo = cloudflareColo(requestHeaders.get("cf-ray"));

  return (
    <div className="font-ui text-[15px] leading-[1.75]">
      <PageHeader name="infra" section={8} kind="System Administration" summary="the machine answering this request">
        <p>
          This site isn&apos;t on a cloud platform. It runs in Docker on a small server in my homelab in Istanbul. The
          server dials out to Cloudflare through a tunnel, so visitors never connect to it directly. Everything below is
          read live from the Prometheus that watches it.
        </p>
      </PageHeader>

      <InfraDashboard initial={data} />

      <ManSection title="HOW THIS REACHED YOU">
        <RequestPath colo={colo} />
      </ManSection>

      <ManSection title="LEFT OUT ON PURPOSE">
        <p className="max-w-[64ch]">
          No IP addresses, hostnames or ports, and no host uptime or kernel version: together they would tell anyone how
          long ago the machine was patched. The code and its pinned versions are public anyway — the commit above links
          to them — so hiding those would only be obscurity. The numbers come from fixed queries cached for a few
          seconds, so this page can&apos;t be used to ask Prometheus anything else, or to load it.
        </p>
      </ManSection>

      <ManSection title="SEE ALSO">
        <p>
          <code>curl bilalyazicioglu.com/infra</code> prints this page in a terminal.
        </p>
      </ManSection>
    </div>
  );
}
