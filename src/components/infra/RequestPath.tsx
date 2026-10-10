/**
 * The route this request took, hop by hop, top to bottom. Server-rendered: the
 * only live part is the Cloudflare data centre, read off this request's cf-ray
 * header.
 */
export function RequestPath({ colo }: { colo: string | null }) {
  const hops = [
    { name: "you", detail: "your browser" },
    { name: "cloudflare", detail: colo ? `edge, ${colo}` : "edge" },
    { name: "tunnel", detail: "dialled out from home" },
    { name: "homeserver", detail: "homelab, Istanbul" },
    { name: "docker", detail: "compose network" },
    { name: "next.js", detail: "rendered this page" },
  ];

  return (
    <>
      <ol className="grid grid-cols-[2ch_max-content_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
        {hops.map((hop, i) => (
          <li key={hop.name} className="contents">
            <span aria-hidden className="text-muted">
              {i === 0 ? "" : "↓"}
            </span>
            <span className={i === 0 ? "text-accent" : undefined}>{hop.name}</span>
            <span className="text-muted">{hop.detail}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 max-w-[64ch] text-muted">The tunnel is dialled out from home, so the router has no open ports.</p>
    </>
  );
}
