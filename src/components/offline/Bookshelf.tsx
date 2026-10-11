import Image from "next/image";
import type { Book } from "@/lib/offline/data";
import { progressBar, shelve } from "@/lib/offline/shelf";

function Cover({ book, reading }: { book: Book; reading: boolean }) {
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[3px] border border-ink/15 bg-ink/[0.06]">
      {book.cover ? (
        <Image
          src={book.cover}
          alt=""
          fill
          unoptimized
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
        const bar = book.progress && progressBar(book.progress);
        return (
          <li key={`${book.title}-${book.author}`} className="flex min-w-0 flex-col gap-1.5">
            <Cover book={book} reading={book.status === "reading"} />
            <p lang={book.lang} className="font-body text-[14px] font-bold leading-tight">
              {book.title}
            </p>
            <p className="text-[12.5px] leading-snug text-muted">
              {book.author}
              {book.progress && `, p. ${book.progress.page} of ${book.progress.pages}`}
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

/** What I'm reading now, then what I read recently. A shelf, not an archive. */
export function Bookshelf({ books }: { books: Book[] }) {
  const { reading, read } = shelve(books);
  if (books.length === 0) {
    return <p className="text-muted">Nothing on the shelf right now.</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {[
        { label: "reading now", books: reading },
        { label: "recently read", books: read },
      ].map(
        (group) =>
          group.books.length > 0 && (
            <section key={group.label} aria-label={group.label}>
              <h3 className="mb-2.5 text-[13px] font-normal text-muted">{group.label}</h3>
              <Shelf books={group.books} />
            </section>
          )
      )}
    </div>
  );
}
