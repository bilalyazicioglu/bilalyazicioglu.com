import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader } from "@/components/PageHeader";
import { InfraDashboard } from "@/components/infra/InfraDashboard";
import { RequestPath } from "@/components/infra/RequestPath";
import { ManSection } from "@/components/Man";
import { cloudflareColo, getInfra } from "@/lib/infra";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Infra",
  description:
    "Live numbers from the homeserver this site runs on: CPU, memory, temperature, traffic, services and the commit that is deployed.",
  alternates: {
    canonical: `${siteConfig.url}/infra`,
  },
};

export default async function InfraPage() {
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
