import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TerminalProvider } from "@/components/terminal/TerminalProvider";

/**
 * The navbar, the reading column and the footer — everything a page of the
 * site sits inside. No frame and no texture: the page is one column of text on
 * papyrus, like a man page. It lives here rather than in the root layout so a
 * page with its own world (the tincan showcase) can leave it out, and so the
 * root 404 can still wear it.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <TerminalProvider>
        <div className="mx-auto flex w-full max-w-[780px] flex-1 flex-col px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
          <Navbar />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </div>
      </TerminalProvider>
    </div>
  );
}
