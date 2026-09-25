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
const DESCRIPTION =
  "tincan is serverless peer-to-peer voice and text chat for your terminal. The unblockable, open-source Discord alternative — zero servers, no accounts, no VPN.";

export const metadata: Metadata = {
  title: { absolute: "tincan — Serverless P2P Voice Chat | Discord Alternative" },
  description: DESCRIPTION,
  keywords: [
    "discord alternative",
    "discord alternatifi",
    "serverless voice chat",
    "p2p voice chat",
    "discord blocked alternative",
    "discord engeli sesli sohbet",
    "terminal voice chat",
    "open source discord alternative",
    "ratatui",
    "rust voice chat",
    "iroh",
    "unblockable voice chat",
    "vpn siz discord alternatifi",
    "peer to peer chat",
  ],
  alternates: { canonical: `${siteConfig.url}/tincan` },
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
    url: `${siteConfig.url}/tincan`,
    title: "tincan — Serverless P2P Voice Chat & Discord Alternative",
    description: DESCRIPTION,
    images: [{ url: "/tincan/preview.png", width: 1074, height: 680, alt: "The tincan terminal interface" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "tincan — Serverless P2P Voice Chat & Discord Alternative",
    description: DESCRIPTION,
    images: ["/tincan/preview.png"],
  },
};

// SoftwareSourceCode rather than SoftwareApplication: the latter is a Google
// rich-result type that requires ratings or reviews, and without them Search
// Console reports the page as having an invalid item.
const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "tincan",
  alternateName: ["tincan-cli", "tincan chat"],
  description: DESCRIPTION,
  url: `${siteConfig.url}/tincan`,
  codeRepository: REPO,
  programmingLanguage: "Rust",
  runtimePlatform: "macOS, Linux, Windows",
  license: "https://opensource.org/licenses/MIT",
  image: `${siteConfig.url}/tincan/preview.png`,
  author: { "@id": `${siteConfig.url}/#person` },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why is tincan the best Discord alternative when Discord is blocked or restricted?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "tincan operates on a serverless peer-to-peer (P2P) architecture. Unlike Discord, which relies on centralized servers that can be blocked via DNS or IP blacklists, tincan routes encrypted audio directly between peers via QUIC. There is no central server, no registration, and no single point of censorship.",
      },
    },
    {
      "@type": "Question",
      name: "Discord engellendiğinde veya erişilemez olduğunda tincan nasıl alternatif sunar? VPN gerekir mi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "tincan kullanmak için VPN veya sunucu kurulumu gerekmez. Sunucusuz ve eşler arası (P2P) çalışan yapısı sayesinde, iki uç doğrudan birbiriyle şifreli QUIC protokolü üzerinden iletişim kurar. Merkezi bir şirket sunucusu bulunmadığı için DNS veya IP engellemelerine takılmaz.",
      },
    },
    {
      "@type": "Question",
      name: "Does tincan require an account, email, or phone number?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. tincan requires zero accounts, zero personal data, and no login. Users create a room and share a short invite code or passphrase. Connections are cryptographically authenticated using ephemeral Ed25519 keys.",
      },
    },
    {
      "@type": "Question",
      name: "How does tincan compare to Discord in audio latency and memory usage?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "tincan uses under 20 MB of RAM compared to Discord's 500+ MB Electron client. Audio is sent directly peer-to-peer using the Opus codec, achieving sub-20ms direct latency without passing through intermediary servers.",
      },
    },
    {
      "@type": "Question",
      name: "How do I install and start tincan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Install tincan via Homebrew (brew tap bilalyazicioglu/tap && brew install tincan), Cargo (cargo install tincan-chat), or npm (npm install -g tincan-cli). Run 'tincan host' to create a room or 'tincan join' to enter.",
      },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
              <span>Two cans</span> <span>and a string.</span>
            </h1>
            <p className="tc-lead">
              tincan is voice and text chat for your terminal, with no server in
              the middle. Open a room, send your friends the code it prints, and
              talk.
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
            <h2 id="tc-unblockable">When central servers go dark.</h2>
            <p>
              When Discord is blocked, goes down, or is restricted on corporate and school networks,
              tincan keeps the line open. Because there is no central server, there is no domain
              or IP address for an ISP or firewall to blacklist. Encrypted audio flows directly
              peer-to-peer between you and your friends over QUIC.
            </p>
            <p className="tc-leg-tr" lang="tr">
              Discord erişim engeli veya ağ kısıtlamalarında VPN, hesap veya sunucu
              kiralamadan doğrudan çalışır. Eşler arası (P2P) şifreli ses hattı, merkezi engellemelere
              takılmaz.
            </p>
          </section>

          <Can who="them" flipped />
        </StringRail>

        <section className="tc-compare" aria-labelledby="tc-compare-title">
          <p className="tc-reading" data-strand="taut">
            <span className="tc-chip">COMPARISON</span>
            <span>tincan vs Discord</span>
          </p>
          <h2 id="tc-compare-title">How tincan compares.</h2>
          <p>
            A private, serverless Discord alternative built for low latency, zero telemetry, and zero maintenance.
          </p>
          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col" className="tc-col-tincan">tincan</th>
                  <th scope="col">Discord</th>
                  <th scope="col">TeamSpeak / Mumble</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="tc-td-label">Architecture</td>
                  <td className="tc-col-tincan">Serverless P2P</td>
                  <td>Centralized Server</td>
                  <td>Self-Hosted Server</td>
                </tr>
                <tr>
                  <td className="tc-td-label">Censorship / Ban Resistant</td>
                  <td className="tc-col-tincan">Yes (Direct QUIC)</td>
                  <td>No (Easy DNS/IP Ban)</td>
                  <td>Partial (Server IP can be blocked)</td>
                </tr>
                <tr>
                  <td className="tc-td-label">VPN Needed in Blocked Regions</td>
                  <td className="tc-col-tincan">No (0 VPN)</td>
                  <td>Yes (Mandatory)</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td className="tc-td-label">Account &amp; Registration</td>
                  <td className="tc-col-tincan">None (Instant code)</td>
                  <td>Required (Email/Phone)</td>
                  <td>Optional</td>
                </tr>
                <tr>
                  <td className="tc-td-label">Memory Footprint</td>
                  <td className="tc-col-tincan">&lt; 20 MB (Rust)</td>
                  <td>500+ MB (Electron)</td>
                  <td>~50 MB</td>
                </tr>
                <tr>
                  <td className="tc-td-label">Voice Encryption</td>
                  <td className="tc-col-tincan">End-to-End (QUIC + Argon2id)</td>
                  <td>Decrypted on Server</td>
                  <td>Configurable</td>
                </tr>
                <tr>
                  <td className="tc-td-label">Open Source License</td>
                  <td className="tc-col-tincan">MIT (100% Open)</td>
                  <td>Proprietary</td>
                  <td>Mixed / Open Source</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="tc-faq" aria-labelledby="tc-faq-title">
          <p className="tc-reading" data-strand="taut">
            <span className="tc-chip">FAQ</span>
            <span>Common Questions</span>
          </p>
          <h2 id="tc-faq-title">Frequently Asked Questions</h2>
          <div className="tc-faq-grid">
            <article className="tc-faq-item">
              <h3>Why is tincan the best Discord alternative when Discord is blocked?</h3>
              <p>
                Discord relies on centralized data centers that governments, ISPs, and network
                administrators can block in seconds via DNS or IP blacklists. tincan has no central
                servers; voice streams travel directly between participants over encrypted QUIC
                datagrams, making it resilient against network censorship and outages.
              </p>
            </article>

            <article className="tc-faq-item">
              <h3 lang="tr"><span className="tc-tag-tr">TR</span>Discord yasaklıyken tincan nasıl çalışır? VPN gerekir mi?</h3>
              <p lang="tr">
                Hayır, VPN gerekmez. tincan tamamen sunucusuz ve eşler arası (P2P) mimariye sahiptir.
                Arkadaşlarınızla konuşmak için tek yapmanız gereken odayı açıp size verilen davet kodunu
                veya parola kelimelerini iletmektir. Iroh NAT delme teknolojisi sayesinde modemler
                ve güvenlik duvarları arkasında bile doğrudan bağlantı kurulur.
              </p>
            </article>

            <article className="tc-faq-item">
              <h3>Does tincan require an account, email, or phone number?</h3>
              <p>
                None. tincan collects zero telemetry, requires no registration, and stores no chat history
                on any cloud server. Identity is an ephemeral Ed25519 public key generated on launch.
              </p>
            </article>

            <article className="tc-faq-item">
              <h3>Can I run tincan in the background while gaming or coding?</h3>
              <p>
                Yes. Built with Rust and Ratatui, tincan runs in your terminal using under 20 MB of RAM
                and negligible CPU, ensuring zero frame drops in games and no distraction during development.
              </p>
            </article>

            <article className="tc-faq-item">
              <h3>How does audio quality and latency compare to Discord?</h3>
              <p>
                tincan uses the high-definition Opus audio codec (up to 48kHz stereo) combined with
                RNNoise neural noise cancellation. Because voice traverses peer-to-peer without central
                relay hops, voice latency is direct and typically under 20ms on regional connections.
              </p>
            </article>

            <article className="tc-faq-item">
              <h3 lang="tr"><span className="tc-tag-tr">TR</span>tincan nasıl kurulur ve başlatılır?</h3>
              <p lang="tr">
                Terminalinizde tek bir komutla kurabilirsiniz: macOS ve Linux için <code>brew tap bilalyazicioglu/tap &amp;&amp; brew install tincan</code>,
                Rust kullanıcıları için <code>cargo install tincan-chat</code> veya Node kullanıcıları için <code>npm install -g tincan-cli</code>.
                Oda açmak için <code>tincan host</code>, odaya katılmak için <code>tincan join</code> yazmanız yeterlidir.
              </p>
            </article>
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
