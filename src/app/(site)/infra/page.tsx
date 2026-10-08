import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader } from "@/components/PageHeader";
import { InfraDashboard } from "@/components/infra/InfraDashboard";
import { RequestPath } from "@/components/infra/RequestPath";
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
    <>
      <PageHeader eyebrow="Infrastructure · live" titleLines={["THIS_", "MACHINE"]} backHref="/" backLabel="Back to home">
        <p className="max-w-xl text-sm leading-relaxed text-ink/70">
          This site isn&apos;t on a cloud platform. It runs in Docker on a small server in my homelab
          in Istanbul. The server dials out to Cloudflare through a tunnel, so visitors never connect to
          it directly. Everything below is read live from the Prometheus that watches it.
        </p>
      </PageHeader>

      <section className="border-b-[1.5px] border-ink px-4 py-8 sm:px-6">
        <p className="mb-4 font-ui text-xs font-bold uppercase tracking-wider text-accent">
          How this page reached you
        </p>
        <RequestPath colo={colo} />
      </section>

      <InfraDashboard initial={data} />

      <section className="px-4 py-8 sm:px-6">
        <p className="mb-3 font-ui text-xs font-bold uppercase tracking-wider text-accent">Left out on purpose</p>
        <p className="max-w-2xl text-sm leading-relaxed text-ink/70">
          No IP addresses, hostnames or ports, and no host uptime or kernel version: together they
          would tell anyone how long ago the machine was patched. The code and its pinned versions are
          public anyway — the commit above links to them — so hiding those would only be obscurity.
          The numbers come from fixed queries cached for a few seconds, so this page can&apos;t be used
          to ask Prometheus anything else, or to load it.
        </p>
      </section>
    </>
  );
}
