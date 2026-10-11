import Image from "next/image";
import type { Book } from "@/lib/offline/data";
import { monthLabel, progressBar, shelve } from "@/lib/offline/shelf";

function Cover({ book, reading }: { book: Book; reading: boolean }) {
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[3px] border border-ink/15 bg-ink/[0.06]">
      {book.cover ? (
        <Image
          src={book.cover}
          alt=""
          fill
          sizes="(max-width: 640px) 45vw, 160px"
          className="object-cover"
        />
      ) : (
        // No cover on file: the title, set like a plain paperback.
        <p lang={book.lang} className="flex h-full items-center p-3 text-center font-body text-[13px] font-bold leading-snug">
          {book.title}
        </p>
      )}
      {reading && (
        <span className="absolute left-1.5 top-1.5 z-10 rounded-[3px] bg-accent px-1.5 py-1 text-[11px] leading-none text-accent-ink">
          reading
        </span>
      )}
    </div>
  );
}

function Shelf({ books }: { books: Book[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-[18px] gap-y-6 min-[480px]:grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(124px,1fr))]">
      {books.map((book) => {
        const bar = book.reading && progressBar(book.reading);
        return (
          <li key={book.title} className="flex min-w-0 flex-col gap-1.5">
            <Cover book={book} reading={Boolean(book.reading)} />
            <p lang={book.lang} className="font-body text-[14px] font-bold leading-tight">
              {book.title}
            </p>
            <p className="text-[12.5px] leading-snug text-muted">
              {book.author}
              {book.reading
                ? `, p. ${book.reading.page} of ${book.reading.pages}`
                : book.finished && `, ${monthLabel(book.finished)}`}
            </p>
            {bar && (
              <p
                aria-hidden
                className="overflow-hidden whitespace-nowrap text-[11px] leading-none tracking-[-0.04em] text-accent"
              >
                {bar[0]}
                <span className="text-ink/20">{bar[1]}</span>
              </p>
            )}
            {book.note && <p className="font-body text-[13px] leading-snug text-muted">{book.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** Current reads on top, then finished books under their year. */
export function Bookshelf({ books }: { books: Book[] }) {
  const { reading, years } = shelve(books);
  if (reading.length === 0 && years.length === 0) {
    return <p className="text-muted">No books here yet.</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {reading.length > 0 && (
        <section aria-label="Reading now">
          <h3 className="mb-2.5 text-[13px] font-normal text-muted">reading now</h3>
          <Shelf books={reading} />
        </section>
      )}
      {years.map(({ year, books }) => (
        <section key={year} aria-label={`Finished in ${year}`}>
          <h3 className="mb-2.5 text-[13px] font-normal text-muted">{year}</h3>
          <Shelf books={books} />
        </section>
      ))}
    </div>
  );
}
