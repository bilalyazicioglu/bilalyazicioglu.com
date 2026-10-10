/**
 * The site reads like a man page: a title line, then sections whose headings
 * are upper case because that is the convention there, not decoration. The
 * same layout `curl bilalyazicioglu.com` prints, so the browser and the
 * terminal describe one site in one voice.
 */

/** `BILAL(1)          User Commands          BILAL(1)` */
export function ManTitle({ name, section, kind }: { name: string; section: number; kind: string }) {
  const id = `${name.toUpperCase()}(${section})`;
  return (
    <div className="my-5 flex justify-between gap-3 font-ui text-sm text-muted">
      <span>{id}</span>
      <span className="hidden sm:inline">{kind}</span>
      <span>{id}</span>
    </div>
  );
}

/** The command the page "ran", above its title line. */
export function ManPrompt({ command }: { command: string }) {
  return (
    <p className="font-ui text-sm text-muted">
      <span className="text-accent">bilal@web</span> ~ % {command}
    </p>
  );
}

export function ManSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-7 scroll-mt-6">
      <h2 className="font-ui text-[15px] font-bold tracking-[0.02em]">{title}</h2>
      <div className="mt-1.5 pl-[2ch] sm:pl-[4ch]">{children}</div>
    </section>
  );
}

/**
 * Two aligned columns: a short key and its text, the way a man page lists
 * options. `stack` puts the key above its text on a phone, for rows whose text
 * would otherwise be squeezed into a column a few words wide.
 */
export function ManRows({
  children,
  className = "",
  stack = false,
}: {
  children: React.ReactNode;
  className?: string;
  stack?: boolean;
}) {
  const cols = stack
    ? "grid-cols-1 sm:grid-cols-[max-content_minmax(0,1fr)]"
    : "grid-cols-[max-content_minmax(0,1fr)]";
  return <div className={`grid ${cols} gap-x-[3ch] gap-y-1 ${className}`}>{children}</div>;
}

/** An in-text link in the accent, underlined only on hover so a list of them stays calm. */
export const manLink =
  "text-accent underline-offset-[3px] hover:underline focus-visible:underline";
