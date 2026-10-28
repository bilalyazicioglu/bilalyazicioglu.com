import type { Metadata } from "next";
import Link from "next/link";
import { ManSection, manLink } from "@/components/Man";
import { PageHeader } from "@/components/PageHeader";
import { Bookshelf } from "@/components/offline/Bookshelf";
import { PlacesMap, type MapPin } from "@/components/offline/PlacesMap";
import { project } from "@/lib/offline/projection";
import { readOffline } from "@/lib/offline/store";
import { tally } from "@/lib/offline/shelf";
import provinceShapes from "@/lib/offline/turkey-provinces.json";
import map from "@/lib/offline/world-map.json";
import { siteConfig } from "@/site.config";

// The fallback deployment publishes the content committed to this branch.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Offline",
  description: "Places I have been and books I have read, away from the keyboard.",
  alternates: {
    canonical: `${siteConfig.url}/offline`,
  },
};

export default function OfflinePage() {
  const { places, books, turkey } = readOffline();
  // Projected here, on the server: the browser gets finished coordinates and
  // the shaded countries, never the whole map's data.
  const pins: MapPin[] = places.map((p) => ({
    ...project(p.lat, p.lng, map),
    slug: p.slug,
    city: p.city,
    country: p.country,
    year: p.year,
    note: p.note,
    photos: p.photos ?? [],
    home: Boolean(p.home),
  }));
  const codes = new Set(places.filter((p) => !p.home).map((p) => p.countryCode));
  const marked = turkey.visited.length + turkey.lived.length;
  // Where provinces are marked, they shade Türkiye instead of the whole country.
  if (marked) codes.delete("TR");
  const visited = map.shapes.filter((s) => codes.has(s.id)).map(({ id, d }) => ({ id, d }));
  const provinces = { all: provinceShapes, visited: turkey.visited, lived: turkey.lived };


  return (
    <div className="font-ui text-[15px] leading-[1.75]">
      <PageHeader name="offline" section={7} kind="Miscellaneous" summary="where I go and what I read away from the keyboard" />

      <ManSection title="PLACES">
        <p className="mb-1 text-[13px] text-muted">{tally(places, marked)}</p>
        <PlacesMap width={map.width} height={map.height} pins={pins} visited={visited} provinces={provinces} />
      </ManSection>

      <ManSection title="RECENT READS">
        <Bookshelf books={books} />
      </ManSection>

      <ManSection title="SEE ALSO">
        <p>
          <Link href="/about" className={manLink}>
            about
          </Link>
          ,{" "}
          <Link href="/blog/xteink-x4" className={manLink}>
            Xteink X4: a mini e-reader
          </Link>
        </p>
      </ManSection>
    </div>
  );
}
