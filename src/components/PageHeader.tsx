import { ManPrompt, ManSection, ManTitle } from "@/components/Man";

/**
 * The top of every inner page: the command that "opened" it, the man page's
 * title line, then NAME — which holds the page's <h1> — and an optional
 * DESCRIPTION. Pages add their own sections below.
 */
export function PageHeader({
  name,
  section,
  kind,
  summary,
  command = `man ${section} ${name}`,
  children,
}: {
  name: string;
  section: number;
  kind: string;
  /** One line under NAME, after the page's name. */
  summary: string;
  command?: string;
  /** DESCRIPTION, when the page has one. */
  children?: React.ReactNode;
}) {
  return (
    <>
      <ManPrompt command={command} />
      <ManTitle name={name} section={section} kind={kind} />
      <ManSection title="NAME">
        <h1 className="font-normal">
          {name}, {summary}
        </h1>
      </ManSection>
      {children && (
        <ManSection title="DESCRIPTION">
          <div className="max-w-[64ch]">{children}</div>
        </ManSection>
      )}
    </>
  );
}
