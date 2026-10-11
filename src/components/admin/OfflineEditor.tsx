"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Book, OfflineData, Place } from "@/lib/offline/data";
import { slugify } from "@/lib/slug";

type Tab = "books" | "places" | "turkey";

const label = "mb-1 block font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60";
const input =
  "w-full border border-ink/40 bg-canvas px-2.5 py-1.5 font-ui text-sm text-ink outline-none focus:border-accent";
const button =
  "border border-ink/30 px-2.5 py-1 font-ui text-[11px] font-bold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-surface disabled:opacity-40";
const primary =
  "border-[1.5px] border-ink bg-ink px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-wider text-surface transition-colors hover:bg-accent hover:text-accent-ink disabled:opacity-40";

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Hata ${res.status}`);
  return body as T;
}

async function upload(file: File, kind: "cover" | "photo", name: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  form.append("name", name);
  return (await json<{ url: string }>(await fetch("/api/admin/offline/media", { method: "POST", body: form }))).url;
}

const move = <T,>(list: T[], i: number, by: number): T[] => {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

/**
 * Edits everything /offline shows. Changes stay here until "Kaydet" sends
 * the whole document; covers and photos are uploaded (and shrunk) right away,
 * but only appear on the site once the data that points at them is saved.
 */
export function OfflineEditor({
  initial,
  provinces,
  backHref,
}: {
  initial: OfflineData;
  provinces: { id: string; name: string }[];
  backHref: string;
}) {
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [tab, setTab] = useState<Tab>("books");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(data) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const next = await json<OfflineData>(
        await fetch("/api/admin/offline", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      );
      setData(next);
      setSaved(next);
      setStatus({ kind: "ok", text: "Kaydedildi; /offline güncellendi." });
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const setBooks = (books: Book[]) => setData((d) => ({ ...d, books }));
  const setPlaces = (places: Place[]) => setData((d) => ({ ...d, places }));

  return (
    <div className="flex flex-col gap-5 px-3 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-ink pb-4">
        <div className="flex items-center gap-3">
          <Link href={backHref} className={button}>
            ← Panel
          </Link>
          <h1 className="font-ui text-sm font-bold uppercase tracking-wider text-ink sm:text-base">Offline</h1>
          <a href="/offline" target="_blank" className="font-ui text-xs text-accent underline-offset-4 hover:underline">
            sayfayı aç ↗
          </a>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="font-ui text-[11px] font-bold uppercase text-ink/50">kaydedilmemiş değişiklik</span>
          )}
          <button type="button" onClick={save} disabled={!dirty || saving} className={primary}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {status && (
        <div
          role="status"
          className={`border p-3 font-ui text-xs font-bold ${
            status.kind === "ok"
              ? "border-accent bg-accent/10 text-accent"
              : "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {status.text}
        </div>
      )}

      <div role="tablist" className="flex gap-1 border-b border-ink/20">
        {(
          [
            ["books", `Kitaplar (${data.books.length})`],
            ["places", `Yerler (${data.places.length})`],
            ["turkey", `Türkiye illeri (${data.turkey.visited.length + data.turkey.lived.length})`],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 font-ui text-xs font-bold uppercase tracking-wider ${
              tab === id ? "border-accent text-ink" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "books" && (
        <BooksTab books={data.books} setBooks={setBooks} onError={(text) => setStatus({ kind: "error", text })} />
      )}
      {tab === "places" && (
        <PlacesTab places={data.places} setPlaces={setPlaces} onError={(text) => setStatus({ kind: "error", text })} />
      )}
      {tab === "turkey" && (
        <TurkeyTab
          provinces={provinces}
          turkey={data.turkey}
          setTurkey={(turkey) => setData((d) => ({ ...d, turkey }))}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- books */

function BooksTab({
  books,
  setBooks,
  onError,
}: {
  books: Book[];
  setBooks: (b: Book[]) => void;
  onError: (t: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const update = (i: number, patch: Partial<Book>) => setBooks(books.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <div className="flex flex-col gap-4">
      <p className="font-ui text-xs text-ink/60">
        Sayfada önce “okuyorum”, sonra “okudum” durumundakiler çıkar; kendi içlerinde buradaki sırayla. Burası arşiv
        değil, bitirdiğin ve artık göstermek istemediğin kitabı silebilirsin.
      </p>
      <form
        className="grid gap-2 border border-dashed border-ink/30 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !author.trim()) return;
          setBooks([{ title: title.trim(), author: author.trim(), status: "reading" }, ...books]);
          setTitle("");
          setAuthor("");
        }}
      >
        <div>
          <label className={label} htmlFor="new-title">
            Kitap adı
          </label>
          <input id="new-title" className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="new-author">
            Yazar
          </label>
          <input id="new-author" className={input} value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <button type="submit" className={primary} disabled={!title.trim() || !author.trim()}>
          + Ekle
        </button>
      </form>

      {books.map((book, i) => (
        <BookRow
          key={i}
          book={book}
          update={(patch) => update(i, patch)}
          remove={() => confirm(`“${book.title}” silinsin mi?`) && setBooks(books.filter((_, j) => j !== i))}
          up={i > 0 ? () => setBooks(move(books, i, -1)) : undefined}
          down={i < books.length - 1 ? () => setBooks(move(books, i, 1)) : undefined}
          onError={onError}
        />
      ))}
    </div>
  );
}

function BookRow({
  book,
  update,
  remove,
  up,
  down,
  onError,
}: {
  book: Book;
  update: (patch: Partial<Book>) => void;
  remove: () => void;
  up?: () => void;
  down?: () => void;
  onError: (t: string) => void;
}) {
  const [isbn, setIsbn] = useState("");
  const [covers, setCovers] = useState<{ url: string; from: string }[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    try {
      const q = isbn.trim()
        ? new URLSearchParams({ isbn: isbn.trim() })
        : new URLSearchParams({ title: book.title, author: book.author });
      const found = (
        await json<{ covers: { url: string; from: string }[] }>(await fetch(`/api/admin/offline/covers?${q}`))
      ).covers;
      setCovers(found);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pick(url: string) {
    setBusy(true);
    try {
      const saved = await json<{ url: string }>(
        await fetch("/api/admin/offline/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, name: book.title }),
        })
      );
      update({ cover: saved.url });
      setCovers(null);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 border border-ink/20 bg-surface p-3 sm:grid-cols-[96px_1fr]">
      <div className="flex flex-col gap-1.5">
        <div className="aspect-[2/3] w-24 overflow-hidden border border-ink/15 bg-ink/5">
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- an admin preview of a just-saved file
            <img src={book.cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <p className="p-2 font-ui text-[10px] text-ink/50">kapak yok</p>
          )}
        </div>
        <label className={`${button} cursor-pointer text-center`}>
          Dosya
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                update({ cover: await upload(file, "cover", book.title) });
              } catch (err) {
                onError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {book.cover && (
          <button type="button" className={button} onClick={() => update({ cover: undefined })}>
            Kaldır
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className={label}>Ad</label>
            <input className={input} value={book.title} onChange={(e) => update({ title: e.target.value })} />
          </div>
          <div>
            <label className={label}>Yazar</label>
            <input className={input} value={book.author} onChange={(e) => update({ author: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className={label}>Durum</label>
            <select
              className={input}
              value={book.status}
              onChange={(e) =>
                update({
                  status: e.target.value as Book["status"],
                  ...(e.target.value === "read" && { progress: undefined }),
                })
              }
            >
              <option value="reading">okuyorum</option>
              <option value="read">okudum</option>
            </select>
          </div>
          {book.status === "reading" && (
            <>
              <div className="w-24">
                <label className={label}>Sayfa</label>
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={book.progress?.page ?? ""}
                  onChange={(e) =>
                    update({ progress: { page: Number(e.target.value) || 0, pages: book.progress?.pages ?? 0 } })
                  }
                />
              </div>
              <div className="w-24">
                <label className={label}>/ Toplam</label>
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={book.progress?.pages ?? ""}
                  onChange={(e) =>
                    update({ progress: { page: book.progress?.page ?? 0, pages: Number(e.target.value) || 0 } })
                  }
                />
              </div>
            </>
          )}
          <div className="w-24">
            <label className={label} title="Başlık İngilizce değilse dil kodu, örn. tr">
              Dil
            </label>
            <input
              className={input}
              placeholder="en"
              value={book.lang ?? ""}
              onChange={(e) => update({ lang: e.target.value || undefined })}
            />
          </div>
        </div>
        <div>
          <label className={label}>Not (sitede kitabın altında görünür)</label>
          <textarea
            rows={2}
            className={input}
            value={book.note ?? ""}
            onChange={(e) => update({ note: e.target.value || undefined })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${input} w-40`}
            placeholder="ISBN (isteğe bağlı)"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <button type="button" className={button} disabled={busy} onClick={search}>
            {busy ? "…" : "Kapak bul"}
          </button>
          <span className="flex-1" />
          <button type="button" className={button} disabled={!up} onClick={up} aria-label="Yukarı taşı">
            ↑
          </button>
          <button type="button" className={button} disabled={!down} onClick={down} aria-label="Aşağı taşı">
            ↓
          </button>
          <button type="button" className={`${button} hover:bg-red-600 hover:border-red-600`} onClick={remove}>
            Sil
          </button>
        </div>

        {covers && (
          <div className="border border-ink/15 p-2">
            {covers.length === 0 ? (
              <p className="font-ui text-xs text-ink/60">
                Kapak bulunamadı. ISBN dene ya da bir görseli “Dosya” ile yükle.
              </p>
            ) : (
              <>
                <p className="mb-2 font-ui text-xs text-ink/60">
                  Doğru kapağı seç (Open Library bazen sayfa taraması ya da yazar fotoğrafı döndürür):
                </p>
                <div className="flex flex-wrap gap-2">
                  {covers.map((c) => (
                    <button
                      key={c.url}
                      type="button"
                      disabled={busy}
                      onClick={() => pick(c.url)}
                      title={c.from}
                      className="w-20 border border-ink/20 hover:border-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote previews, only for the admin */}
                      <img
                        src={c.url}
                        alt={c.from}
                        className="aspect-[2/3] w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
            <button type="button" className={`${button} mt-2`} onClick={() => setCovers(null)}>
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- places */

type City = { city: string; country: string; countryCode: string; lat: number; lng: number; label: string };

function PlacesTab({
  places,
  setPlaces,
  onError,
}: {
  places: Place[];
  setPlaces: (p: Place[]) => void;
  onError: (t: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<City[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const update = (slug: string, patch: Partial<Place>) =>
    setPlaces(places.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    try {
      setFound(
        (
          await json<{ cities: City[] }>(
            await fetch(`/api/admin/offline/geocode?q=${encodeURIComponent(query.trim())}`)
          )
        ).cities
      );
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function add(c: City) {
    const base = slugify(c.city) || "place";
    let slug = base;
    for (let n = 2; places.some((p) => p.slug === slug); n++) slug = `${base}-${n}`;
    setPlaces([
      ...places,
      { slug, city: c.city, country: c.country, countryCode: c.countryCode, lat: c.lat, lng: c.lng },
    ]);
    setFound(null);
    setQuery("");
    setOpen(slug);
  }

  const shown = places.filter((p) =>
    `${p.city} ${p.country}`.toLocaleLowerCase("tr").includes(filter.toLocaleLowerCase("tr"))
  );

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex flex-col gap-2 border border-dashed border-ink/30 p-3">
        <label className={label} htmlFor="place-q">
          Yer ekle: şehir ara
        </label>
        <div className="flex gap-2">
          <input
            id="place-q"
            className={input}
            placeholder="Oviedo, Gent, Kaş…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className={primary} disabled={busy || !query.trim()}>
            {busy ? "…" : "Ara"}
          </button>
        </div>
        {found && (
          <ul className="flex flex-col gap-1">
            {found.length === 0 && <li className="font-ui text-xs text-ink/60">Bulunamadı.</li>}
            {found.map((c) => (
              <li key={`${c.lat},${c.lng}`}>
                <button
                  type="button"
                  onClick={() => add(c)}
                  className="text-left font-ui text-sm text-accent hover:underline"
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <input className={input} placeholder="Listede ara…" value={filter} onChange={(e) => setFilter(e.target.value)} />

      <ul className="flex flex-col divide-y divide-ink/10 border border-ink/20 bg-surface">
        {shown.map((p) => (
          <li key={p.slug}>
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setOpen(open === p.slug ? null : p.slug)}
                aria-expanded={open === p.slug}
                className="flex-1 text-left font-ui text-sm"
              >
                <b>{p.city}</b> <span className="text-ink/50">{p.country}</span>
                {p.home && <span className="ml-2 text-[11px] font-bold uppercase text-accent">ev</span>}
                {p.year && <span className="ml-2 text-ink/50">{p.year}</span>}
                {p.note && <span className="ml-2 text-ink/40">· not</span>}
                {p.photos?.length ? <span className="ml-2 text-ink/40">· {p.photos.length} foto</span> : null}
              </button>
              <button
                type="button"
                className={`${button} hover:bg-red-600 hover:border-red-600`}
                onClick={() => confirm(`${p.city} silinsin mi?`) && setPlaces(places.filter((x) => x.slug !== p.slug))}
              >
                Sil
              </button>
            </div>
            {open === p.slug && <PlaceForm place={p} update={(patch) => update(p.slug, patch)} onError={onError} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlaceForm({
  place,
  update,
  onError,
}: {
  place: Place;
  update: (patch: Partial<Place>) => void;
  onError: (t: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const photos = place.photos ?? [];
  const setPhotos = (next: Place["photos"]) => update({ photos: next && next.length ? next : undefined });

  return (
    <div className="grid gap-2 border-t border-ink/10 bg-canvas/40 p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={label}>Şehir</label>
          <input className={input} value={place.city} onChange={(e) => update({ city: e.target.value })} />
        </div>
        <div>
          <label className={label}>Yıl</label>
          <input
            type="number"
            className={input}
            value={place.year ?? ""}
            onChange={(e) => update({ year: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 font-ui text-sm">
          <input
            type="checkbox"
            checked={Boolean(place.home)}
            onChange={(e) => update({ home: e.target.checked || undefined })}
          />
          yaşadığım yer
        </label>
      </div>
      <div>
        <label className={label}>Not (pine tıklayınca açılan kartta görünür)</label>
        <textarea
          rows={2}
          className={input}
          value={place.note ?? ""}
          onChange={(e) => update({ note: e.target.value || undefined })}
        />
      </div>
      <div>
        <p className={label}>Fotoğraflar (konum bilgisi silinir, 1600px&apos;e küçültülür)</p>
        <div className="flex flex-wrap gap-3">
          {photos.map((ph, i) => (
            <div key={ph.src} className="flex w-36 flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- an admin preview */}
              <img src={ph.src} alt={ph.alt} className="aspect-[4/3] w-full border border-ink/15 object-cover" />
              <input
                className={`${input} text-xs`}
                placeholder="ne görünüyor?"
                value={ph.alt}
                onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  className={button}
                  disabled={i === 0}
                  onClick={() => setPhotos(move(photos, i, -1))}
                >
                  ←
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={i === photos.length - 1}
                  onClick={() => setPhotos(move(photos, i, 1))}
                >
                  →
                </button>
                <button type="button" className={button} onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>
                  Sil
                </button>
              </div>
            </div>
          ))}
          <label className={`${button} flex h-10 cursor-pointer items-center`}>
            {busy ? "Yükleniyor…" : "+ Fotoğraf"}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                if (!files.length) return;
                setBusy(true);
                try {
                  const added = [];
                  for (const f of files) added.push({ src: await upload(f, "photo", place.slug), alt: "" });
                  setPhotos([...photos, ...added]);
                } catch (err) {
                  onError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>
      </div>
      <p className="font-ui text-[11px] text-ink/50">
        {place.countryCode} · {place.lat}, {place.lng}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- turkey */

function TurkeyTab({
  provinces,
  turkey,
  setTurkey,
}: {
  provinces: { id: string; name: string }[];
  turkey: OfflineData["turkey"];
  setTurkey: (t: OfflineData["turkey"]) => void;
}) {
  const stateOf = (id: string) =>
    turkey.lived.includes(id) ? "lived" : turkey.visited.includes(id) ? "visited" : "none";
  // One click steps through: not been, been, lived.
  function cycle(id: string) {
    const visited = turkey.visited.filter((c) => c !== id);
    const lived = turkey.lived.filter((c) => c !== id);
    const state = stateOf(id);
    if (state === "none") visited.push(id);
    if (state === "visited") lived.push(id);
    setTurkey({ visited: visited.sort(), lived: lived.sort() });
  }
  const sorted = [...provinces].sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <div className="flex flex-col gap-3">
      <p className="font-ui text-xs text-ink/60">
        Bir ile tıkla: boş → <span className="font-bold text-accent">gittim</span> →{" "}
        <span className="font-bold text-ink">yaşadım</span> → boş. Haritada gittiğin iller açık, yaşadıkların koyu
        boyanır.
      </p>
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6">
        {sorted.map((p) => {
          const state = stateOf(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => cycle(p.id)}
                aria-label={`${p.name}: ${state === "lived" ? "yaşadım" : state === "visited" ? "gittim" : "gitmedim"}`}
                className={`w-full border px-2 py-1 text-left font-ui text-xs ${
                  state === "lived"
                    ? "border-ink bg-ink text-surface"
                    : state === "visited"
                      ? "border-accent bg-accent/15 text-ink"
                      : "border-ink/15 text-ink/70 hover:border-ink/40"
                }`}
              >
                {p.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
