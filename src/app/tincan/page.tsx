import type { Metadata } from "next";
import Link from "next/link";
import { Big_Shoulders, Martian_Mono } from "next/font/google";
import { LiveTerminal } from "@/components/tincan/LiveTerminal";
import { InstallTabs } from "@/components/tincan/InstallTabs";
import { StringRail } from "@/components/tincan/StringRail";
import { DemoLoop } from "@/components/tincan/DemoLoop";
import { Meander } from "@/components/tincan/Meander";
import { siteConfig } from "@/site.config";
import "./tincan.css";

// Big Shoulders is the lettering stamped on a can; Martian Mono is the
// terminal the can lives in. Two families, clearly apart, and nothing else.
const shoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
});

const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

const REPO = "https://github.com/bilalyazicioglu/tincan-cli";
const PAGE = `${siteConfig.url}/tincan`;
const VERSION = "0.3.1";
const DESCRIPTION =
  "tincan is serverless peer-to-peer voice and text chat for your terminal: an open-source Discord alternative with no accounts, no port forwarding and no VPN.";

export const metadata: Metadata = {
  title: { absolute: "tincan — Serverless P2P Voice Chat | Discord Alternative" },
  description: DESCRIPTION,
  keywords: [
    "discord alternative",
    "discord alternatifi",
    "serverless voice chat",
    "p2p voice chat",
    "terminal voice chat",
    "open source discord alternative",
    "ratatui",
    "rust voice chat",
    "iroh",
    "peer to peer chat",
  ],
  alternates: {
    canonical: PAGE,
    // The same facts as plain Markdown, for language models (llmstxt.org).
    types: { "text/markdown": "/tincan/llms.txt" },
  },
  // The app's own icon in the tab, as it appears in the README and on npm.
  icons: {
    icon: [
      { url: "/tincan/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/tincan/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/tincan/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/tincan/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: PAGE,
    siteName: siteConfig.name,
    locale: "en_US",
    title: "tincan — Serverless P2P Voice Chat & Discord Alternative",
    description: DESCRIPTION,
    images: [{ url: "/tincan/preview.png", width: 1074, height: 680, alt: "The tincan terminal interface" }],
    videos: [{ url: "/uploads/blog/tincan-demo.mp4", type: "video/mp4" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "tincan — Serverless P2P Voice Chat & Discord Alternative",
    description: DESCRIPTION,
    images: ["/tincan/preview.png"],
  },
};

/**
 * The questions are written once: the page shows them and the FAQPage data
 * repeats them, and search engines only trust structured data that matches
 * what is on the page. Backticks mark commands.
 */
const FAQ: { q: string; a: string; lang?: "tr" }[] = [
  {
    q: "Does tincan work when Discord is blocked?",
    a: "Usually, yes. Blocking Discord means blocking Discord's domains and servers, and tincan has no server of its own to block. Peers find each other through iroh's public discovery service and relays, run by Number Zero, and voice goes directly between the machines over encrypted QUIC. A network that blocks those services, or all UDP traffic, stops tincan too.",
  },
  {
    q: "Discord engelliyken tincan çalışır mı? VPN gerekir mi?",
    a: "Çoğu durumda VPN gerekmez. Discord erişim engeli Discord'un alan adlarını ve sunucularını hedefler; tincan'ın ise engellenecek kendi sunucusu yok. Eşler birbirini iroh'un açık keşif servisi ve Number Zero'nun relay sunucuları üzerinden bulur, ses doğrudan iki bilgisayar arasında şifreli QUIC ile akar. Bu servisleri ya da tüm UDP trafiğini engelleyen bir ağda tincan da çalışmaz.",
    lang: "tr",
  },
  {
    q: "Do I need an account, an email address or a phone number?",
    a: "No. There is nothing to sign up for or log in to. You open a room and share either its name and a four-word passphrase, or a 63-character invite code. Each machine is known by a public key, and no copy of the conversation is kept anywhere but on the machines having it.",
  },
  {
    q: "Is tincan encrypted?",
    a: "Every connection is QUIC, encrypted between the two machines at its ends and checked against the other side's public key. Voice goes directly from peer to peer; chat and the roster go through the host, who is one of the people in the room. Relays forward packets they cannot read, though they can see which keys are talking, when and how much. Everyone in a room learns everyone else's IP address.",
  },
  {
    q: "How good is the audio, and how much bandwidth does it use?",
    a: "Voice is Opus at 48 kHz mono and 32 kbps, sent in 20 ms frames, with RNNoise noise suppression on your microphone. Suppression adds 10 ms of delay and can be turned off on the audio settings screen. A six-person room needs about 160 kbps of upload each.",
  },
  {
    q: "Can I keep it running while gaming or coding?",
    a: "Yes. tincan is a native Rust program that lives in a terminal tab, not an Electron app. Start it with `--ptt` for push-to-talk on F4, or `--no-voice` for text chat only.",
  },
  {
    q: "Does tincan run on Windows?",
    a: "macOS and Linux are where it is used day to day. A Windows build is compiled and tested in CI but has not yet been used on a real Windows machine. Try it with `npx tincan-cli host`, or download the zip from the latest GitHub release.",
  },
  {
    q: "How do I install tincan and open a room?",
    a: "Install it with Homebrew (`brew tap bilalyazicioglu/tap && brew install tincan`), Cargo (`cargo install tincan-chat`) or npm (`npm install -g tincan-cli`). Then run `tincan host lobby` to open a room and `tincan join lobby` to join it.",
  },
  {
    q: "tincan nasıl kurulur ve başlatılır?",
    a: "macOS ve Linux'ta Homebrew ile (`brew tap bilalyazicioglu/tap && brew install tincan`), Rust kullanıyorsanız `cargo install tincan-chat` ile, Node kullanıyorsanız `npm install -g tincan-cli` ile kurabilirsiniz. Oda açmak için `tincan host lobby`, katılmak için `tincan join lobby` yazmanız yeterli.",
    lang: "tr",
  },
  {
    q: "Is tincan free?",
    a: "Yes. tincan is open source under the MIT license, and there is no paid tier, because there is no service to pay for.",
  },
];

function Answer({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  );
}

// One graph, so the page, the program, the video and the questions point at
// each other by @id. SoftwareSourceCode rather than SoftwareApplication: the
// latter is a Google rich-result type that requires ratings or reviews, and
// without them Search Console reports the page as having an invalid item.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE}#webpage`,
      url: PAGE,
      name: "tincan — serverless peer-to-peer voice chat for the terminal",
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": `${siteConfig.url}/#website` },
      about: { "@id": `${PAGE}#software` },
      mainEntity: { "@id": `${PAGE}#software` },
      author: { "@id": `${siteConfig.url}/#person` },
      primaryImageOfPage: `${siteConfig.url}/tincan/preview.png`,
      video: { "@id": `${PAGE}#demo` },
      breadcrumb: { "@id": `${PAGE}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Projects", item: `${siteConfig.url}/projects` },
        { "@type": "ListItem", position: 3, name: "tincan", item: PAGE },
      ],
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${PAGE}#software`,
      name: "tincan",
      alternateName: ["tincan-cli", "tincan-chat"],
      description: DESCRIPTION,
      url: PAGE,
      codeRepository: REPO,
      sameAs: [
        REPO,
        "https://crates.io/crates/tincan-chat",
        "https://www.npmjs.com/package/tincan-cli",
      ],
      programmingLanguage: { "@type": "ComputerLanguage", name: "Rust" },
      runtimePlatform: ["macOS", "Linux", "Windows"],
      version: VERSION,
      license: "https://opensource.org/licenses/MIT",
      isAccessibleForFree: true,
      keywords:
        "peer-to-peer voice chat, serverless, terminal, TUI, Discord alternative, QUIC, iroh, Opus, Ratatui",
      image: `${siteConfig.url}/tincan/preview.png`,
      author: { "@id": `${siteConfig.url}/#person` },
    },
    {
      "@type": "VideoObject",
      "@id": `${PAGE}#demo`,
      name: "tincan in a real terminal",
      description:
        "A 12-second screen recording of tincan: audio meters, the latency pulse travelling down the string, chat, and the audio settings screen.",
      contentUrl: `${siteConfig.url}/uploads/blog/tincan-demo.mp4`,
      thumbnailUrl: `${siteConfig.url}/tincan/demo-poster.jpg`,
      uploadDate: "2026-09-17",
      duration: "PT12S",
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE}#faq`,
      isPartOf: { "@id": `${PAGE}#webpage` },
      mainEntity: FAQ.map(({ q, a, lang }) => ({
        "@type": "Question",
        name: q,
        inLanguage: lang ?? "en",
        acceptedAnswer: { "@type": "Answer", text: a.replaceAll("`", "") },
      })),
    },
  ],
};

function Can({ who, flipped = false }: { who: string; flipped?: boolean }) {
  // The string leaves your can from underneath and enters theirs from above.
  const lines = flipped
    ? ["┌──┴──┐", "│     │", "└─────┘", " ( o ) "]
    : [" ( o ) ", "┌─────┐", "│     │", "└──┬──┘"];
  return (
    <div className={`tc-can${flipped ? " tc-can--them" : ""}`}>
      {!flipped && <span className="tc-can-who">{who}</span>}
      <pre aria-hidden="true">
        {lines.map((line, i) => (
          <span key={i} className={line.includes("( o )") ? "i-brass" : undefined}>
            {line}
            {"\n"}
          </span>
        ))}
      </pre>
      {flipped && <span className="tc-can-who">{who}</span>}
    </div>
  );
}

/** The paths share a 100×100 box stretched over the leg; x=50 is the gutter's middle. */
const SAG_CONTROL_X = 0;
const STRAND_PATHS: Record<string, string[]> = {
  taut: ["M50 0 L50 100"],
  // A quadratic bow: y stays linear in t, which is what lets StringRail keep
  // the pulse on the curve (see `sagAt` there).
  slack: [`M50 0 Q${SAG_CONTROL_X} 50 50 100`],
  frayed: ["M50 0 L50 100", "M50 34 l-9 2.5", "M50 35 l7 3", "M50 71 l8 -2", "M50 72 l-6 3.5"],
};

/**
 * Each leg draws its own stretch of the string and says, in the app's words,
 * what state it is in — the reading the header chip gives in the terminal.
 */
function Reading({
  chip,
  ms,
  strand,
  glass,
}: {
  chip: string;
  ms: string;
  strand: string;
  /**
   * Let this leg's string wander behind the copy instead of running down the
   * gutter, looping behind the element this selector names — the leg's glass.
   */
  glass?: string;
}) {
  return (
    <>
      {glass ? <Meander glass={glass} /> : <svg className="tc-strand" data-strand={strand} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {STRAND_PATHS[strand].map((d, i) => (
          <path key={d} d={d} className={i > 0 ? "tc-fibre" : undefined} />
        ))}
      </svg>}
      <p className="tc-reading" data-strand={strand}>
        <span className="tc-chip">{chip}</span>
        <span>{ms}</span>
      </p>
    </>
  );
}

export default function TincanPage() {
  return (
    <div className={`tc ${shoulders.variable} ${martian.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="tc-top">
        <a href="#tc-title" className="tc-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 32px mark; nothing for next/image to optimise */}
          <img src="/tincan/logo-224.png" alt="" width={32} height={32} />
          <span>tincan</span>
        </a>
        <a href={REPO} className="tc-github">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
          <span>GitHub</span>
          {/* Leaving the site: a box with the arrow breaking out of its corner. */}
          <svg className="tc-out" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M7 3.5H2.5v10h10V9M9.5 2.5h4v4M13.5 2.5 7 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
          <span className="tc-sr">(opens github.com)</span>
        </a>
      </header>

      <main>
        <section className="tc-hero" aria-labelledby="tc-title">
          <div className="tc-hero-intro">
            <h1 id="tc-title">
              <span>Two cans</span> <span>and a string.</span>{" "}
              {/* The words people search for, in the heading search engines
                  read first, set as the line that says what the picture is. */}
              <span className="tc-h1-says">
                tincan: serverless <span className="tc-nowrap">peer-to-peer</span> voice chat
                for your terminal
              </span>
            </h1>
            <p className="tc-lead">
              Voice and text chat with no server in the middle. Open a room, send
              your friends the code it prints, and talk.
            </p>
          </div>
          <LiveTerminal />
          <div className="tc-hero-install">
            <InstallTabs />
            <p className="tc-facts">
              <a href="https://crates.io/crates/tincan-chat">v0.3.1</a>
              <a href={`${REPO}/blob/main/LICENSE`}>MIT licensed</a>
              <a href="https://ratatui.rs/">Built with Ratatui</a>
            </p>
          </div>
        </section>

        <StringRail>
          <Can who="you" />

          <section className="tc-leg" data-strand="taut" aria-labelledby="tc-open">
            <Reading chip="DIRECT" ms="18ms" strand="taut" />
            <h2 id="tc-open">Open a room, hand out two words.</h2>
            <p>
              The first person to run tincan opens the room. It prints a room
              name and a passphrase, and that is all anyone else needs: two
              things short enough to read down the phone.
            </p>
            <pre className="tc-shell">
              <span className="i-zinc">$ </span>tincan host lobby --name alice{"\n"}
              <span className="i-zinc">room:        </span>lobby{"\n"}
              <span className="i-zinc">passphrase:  </span>
              <span className="i-brass">chestnut-ferry-lens-moss</span>
              {"\n\n"}
              <span className="i-zinc">$ </span>tincan join lobby --name bob{"\n"}
              <span className="i-zinc">passphrase: </span>
              <span className="i-dim">••••••••••••••••••••••••</span>
            </pre>
            <p>
              Leave the room name out and you get a 63-character invite code
              instead: the host&apos;s public key, already on your clipboard. No
              accounts, no port forwarding, no VPN.
            </p>
          </section>

          <section className="tc-leg" data-strand="taut" data-meander="" aria-labelledby="tc-planes">
            <Reading chip="DIRECT" ms="18ms" strand="taut" glass=".tc-figure pre" />
            <h2 id="tc-planes">Voice goes straight between you.</h2>
            <p>
              Whoever opens the room keeps the roster, the channels and the chat,
              which comes to a few hundred bytes a second. Voice never goes
              through them. Everyone in a channel sends Opus packets directly to
              everyone else as QUIC datagrams, so the host&apos;s connection is
              never the bottleneck.
            </p>
            <figure className="tc-figure">
              <pre aria-hidden="true">
                {"        "}
                <span className="i-tin">alice</span>
                <span className="i-zinc"> (host)</span>
                {"\n"}
                <span className="i-zinc">{"        /    |    \\"}</span>
                {"\n"}
                <span className="i-tin">{"     bob   carol   dave"}</span>
                {"\n"}
                <span className="i-patina">{"        \\____|____/"}</span>
              </pre>
              <figcaption>
                <span>
                  <i className="tc-swatch tc-swatch--control" /> roster and chat, through
                  the host
                </span>
                <span>
                  <i className="tc-swatch tc-swatch--voice" /> voice, peer to peer
                </span>
              </figcaption>
            </figure>
            <p className="tc-aside">
              A six-person room needs about 160 kbps of upload each.
            </p>
          </section>

          <section className="tc-leg" data-strand="taut" aria-labelledby="tc-secret">
            <Reading chip="DIRECT" ms="18ms" strand="taut" />
            <h2 id="tc-secret">The passphrase never goes over the wire.</h2>
            <p>
              Both sides stretch it with Argon2id into an admission key. The host
              sends a fresh nonce; the guest answers with a keyed BLAKE2b MAC of
              it. An answer caught in transit is useless on the next connection,
              and nobody can make the host burn Argon2 work by knocking.
            </p>
            <p>
              The passphrase decides who gets in. Keeping what is said private is
              QUIC&apos;s job: every connection is encrypted end to end, and each
              side is checked against its public key.
            </p>
          </section>

          <section className="tc-leg" data-strand="slack" aria-labelledby="tc-relay">
            <Reading chip="RELAY" ms="84ms" strand="slack" />
            <h2 id="tc-relay">When the direct path fails, the string sags.</h2>
            <p>
              Two machines behind routers usually punch through to each other.
              When they can&apos;t, the traffic goes through a relay. The relay
              forwards packets it has no key for. It can see which two keys are
              talking, when and how much, but never what is said.
            </p>
            <p>
              In tincan, the line between the channel list and the chat behaves
              like the one on this page. It runs taut{" "}
              <span className="tc-glyph i-verdigris">│</span> when everyone is
              reached directly, sags{" "}
              <span className="tc-glyph i-brass">╎</span> through a relay, and
              frays <span className="tc-glyph i-alarm">┆</span> when audio starts
              dropping. While someone talks, a pulse runs down it at the speed of
              the round trip, so you see a slow link before you read about it.
            </p>
          </section>

          <section className="tc-leg" data-strand="frayed" aria-labelledby="tc-limits">
            <Reading chip="CHOPPY" ms="84ms" strand="frayed" />
            <h2 id="tc-limits">What it can&apos;t do without.</h2>
            <p>
              Serverless means there is no tincan server: no account, no room
              registry, and no copy of your conversation anywhere but on the
              machines having it. It doesn&apos;t mean no infrastructure. Peers
              find each other through the DNS and relays run by{" "}
              <a href="https://n0.computer">Number Zero</a>, the company behind
              iroh. If those went away, new connections would stop working.
              Pointing tincan at your own relay is{" "}
              <a href={`${REPO}/issues/136`}>issue #136</a>.
            </p>
            <p>
              Being reachable also means being found. Everyone in a room learns
              everyone else&apos;s IP address. With a real tin-can phone, the
              other end knows where you are too.
            </p>
          </section>

          <section className="tc-leg" data-strand="taut" aria-labelledby="tc-real">
            <Reading chip="DIRECT" ms="18ms" strand="taut" />
            <h2 id="tc-real">Recorded, not rendered.</h2>
            <p>
              The terminal at the top of this page is an imitation written for
              it. This is tincan itself, recorded in a real terminal.
            </p>
            <DemoLoop />
          </section>

          <section className="tc-leg" data-strand="taut" aria-labelledby="tc-unblockable">
            <Reading chip="DIRECT" ms="18ms" strand="taut" />
            <h2 id="tc-unblockable">When Discord is blocked.</h2>
            <p>
              When Discord is blocked in your country, down for everyone, or
              filtered on a school or office network, tincan has nothing of its
              own to take down with it. There is no tincan domain or server
              address for a provider to blacklist: peers find each other through
              iroh&apos;s discovery service and talk directly over encrypted
              QUIC. A network that blocks those services, or all UDP, stops it
              too.
            </p>
            <p className="tc-leg-tr" lang="tr">
              Discord&apos;a erişim engeli olan ağlarda tincan çoğu zaman VPN,
              hesap ya da sunucu kiralamadan çalışır: engellenecek bir tincan
              sunucusu yok, ses iki bilgisayar arasında doğrudan ve şifreli akar.
            </p>
          </section>

          <Can who="them" flipped />
        </StringRail>

        <section className="tc-compare" aria-labelledby="tc-compare-title">
          <h2 id="tc-compare-title">tincan, Discord and Mumble.</h2>
          <p>
            Discord keeps everything on its servers; Mumble and TeamSpeak need
            someone to run one. tincan has no server at all.
          </p>
          <div className="tc-table-wrap">
            <table className="tc-table">
              <caption className="tc-sr">
                tincan compared with Discord and with TeamSpeak or Mumble
              </caption>
              <thead>
                <tr>
                  <td />
                  <th scope="col" className="tc-col-tincan">tincan</th>
                  <th scope="col">Discord</th>
                  <th scope="col">TeamSpeak / Mumble</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Where voice goes</th>
                  <td className="tc-col-tincan">Directly between peers</td>
                  <td>Discord&apos;s voice servers</td>
                  <td>The server</td>
                </tr>
                <tr>
                  <th scope="row">Server to run or rent</th>
                  <td className="tc-col-tincan">None</td>
                  <td>Discord&apos;s</td>
                  <td>Yours</td>
                </tr>
                <tr>
                  <th scope="row">What a network must block</th>
                  <td className="tc-col-tincan">iroh discovery and relays, or UDP</td>
                  <td>Discord&apos;s domains</td>
                  <td>The server&apos;s address</td>
                </tr>
                <tr>
                  <th scope="row">Account</th>
                  <td className="tc-col-tincan">None</td>
                  <td>Email or phone</td>
                  <td>Optional</td>
                </tr>
                <tr>
                  <th scope="row">Chat history kept on</th>
                  <td className="tc-col-tincan">The machines in the room</td>
                  <td>Discord&apos;s servers</td>
                  <td>The server, if enabled</td>
                </tr>
                <tr>
                  <th scope="row">Client</th>
                  <td className="tc-col-tincan">Native terminal app (Rust)</td>
                  <td>Electron app</td>
                  <td>Native desktop app</td>
                </tr>
                <tr>
                  <th scope="row">Source</th>
                  <td className="tc-col-tincan">Open, MIT</td>
                  <td>Closed</td>
                  <td>TeamSpeak closed, Mumble BSD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="tc-faq" aria-labelledby="tc-faq-title">
          <h2 id="tc-faq-title">Questions.</h2>
          {/* Closed until asked, and only one open at a time (`name`), so the
              list stays the height of its questions. The answers are still in
              the page, where search engines and find-in-page reach them. */}
          <div className="tc-faq-list">
            {FAQ.map(({ q, a, lang }) => (
              <details key={q} name="tc-faq" className="tc-faq-item" lang={lang}>
                <summary>
                  <h3>{q}</h3>
                </summary>
                <p>
                  <Answer text={a} />
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="tc-end" aria-labelledby="tc-their-end">
          <h2 id="tc-their-end">Their end.</h2>
          <p className="tc-lead">
            Install it, open a room, and send them the code.
          </p>
          <InstallTabs />
          <ul className="tc-links">
            <li>
              <a href={REPO}>Source on GitHub</a>
            </li>
            <li>
              <Link href="/blog/tincan-serverless-voice-chat-in-terminal">The story behind it</Link>
              {" "}
              <Link href="/blog/tincan-terminalde-sesli-sohbet" lang="tr" className="tc-alt">
                (Türkçe)
              </Link>
            </li>
            <li>
              <a href={`${REPO}/blob/main/docs/wiki/9-Interface-Design.md`}>Interface design notes</a>
            </li>
            <li>
              <a href="https://crates.io/crates/tincan-chat">crates.io</a>
            </li>
            <li>
              <a href="https://www.npmjs.com/package/tincan-cli">npm</a>
            </li>
          </ul>
        </section>
      </main>

      <footer className="tc-foot">
        <p>
          tincan is MIT licensed and made by{" "}
          <Link href="/">{siteConfig.heroName}</Link>.
        </p>
      </footer>
    </div>
  );
}
