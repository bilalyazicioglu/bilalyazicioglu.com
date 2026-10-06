/**
 * The route this request took, hop by hop. Server-rendered: the only live
 * part is the Cloudflare data centre, read off this request's cf-ray header.
 */
export function RequestPath({ colo }: { colo: string | null }) {
  const hops = [
    { name: "You", detail: "browser" },
    { name: "Cloudflare", detail: colo ? `edge · ${colo}` : "edge" },
    { name: "Tunnel", detail: "dialled out from home" },
    { name: "Homeserver", detail: "Istanbul · my room" },
    { name: "Docker", detail: "compose network" },
    { name: "Next.js", detail: "rendered this page" },
  ];

  return (
    <ol className="grid gap-2 lg:grid-cols-6 lg:gap-0">
      {hops.map((hop, i) => (
        <li key={hop.name} className="flex items-stretch gap-1">
          <div className="flex-1 rounded-xl border border-ink/15 px-3 py-2.5">
            <p className="font-ui text-xs font-bold uppercase tracking-wider">
              <span className="mr-1.5 text-accent">{String(i + 1).padStart(2, "0")}</span>
              {hop.name}
            </p>
            <p className="mt-0.5 font-ui text-[10px] uppercase tracking-wider text-muted">{hop.detail}</p>
          </div>
          {i < hops.length - 1 && (
            <span aria-hidden className="hidden self-center font-ui text-xs text-muted lg:block">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
