import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TerminalProvider } from "@/components/terminal/TerminalProvider";
import { PanelFrame } from "@/components/PanelFrame";

/**
 * The drafting sheet, the panel and its navbar/footer — everything a page of the
 * site sits inside. It lives here rather than in the root layout so a page with
 * its own world (the tincan showcase) can leave it out, and so the root 404 can
 * still wear it.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-grid flex min-h-screen flex-col bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-6 sm:px-6 sm:py-10">
        <TerminalProvider>
          <PanelFrame>
            <div className="flex flex-1 flex-col">
              <Navbar />
              <main className="flex flex-1 flex-col">{children}</main>
              <Footer />
            </div>
          </PanelFrame>
        </TerminalProvider>
      </div>
    </div>
  );
}
