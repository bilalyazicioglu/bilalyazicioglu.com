import type { ReactNode } from "react";
import Link from "next/link";
import { DemoLoop } from "@/components/tincan/DemoLoop";
import { siteConfig } from "@/site.config";

/**
 * Everything the tincan page says, once per language. The page's shape lives
 * in TincanPage; this file is only words. The terminal, the commands and the
 * app's own labels (DIRECT, RELAY, room:, passphrase:) stay in English on
 * every page, because they are what the program prints.
 */
export type Lang = "en" | "tr";

export const REPO = "https://github.com/bilalyazicioglu/tincan-cli";

export const PAGES: Record<Lang, string> = {
  en: `${siteConfig.url}/tincan`,
  tr: `${siteConfig.url}/tincan/tr`,
};

type LegId = "open" | "planes" | "secret" | "relay" | "limits" | "real" | "blocked";

type Copy = {
  meta: {
    title: string;
    ogTitle: string;
    description: string;
    keywords: string[];
    locale: string;
    imageAlt: string;
    pageName: string;
    videoName: string;
    videoDescription: string;
    crumbs: [string, string];
  };
  ui: {
    nav: string;
    other: { href: string; lang: Lang; label: string };
    leaving: string;
    license: string;
    ratatui: string;
  };
  hero: { title: [string, string]; says: ReactNode; lead: string };
  cans: [string, string];
  legs: Record<LegId, { title: string; body: ReactNode }>;
  compare: { title: string; lead: string; caption: string; rows: [string, string, string, string][] };
  faq: { title: string; items: { q: string; a: string }[] };
  end: { title: string; lead: string; links: ReactNode };
  foot: ReactNode;
};

/* --- Pieces both languages share ---------------------------------------- */

function RoomShell() {
  return (
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
  );
}

function PlanesFigure({ control, voice }: { control: string; voice: string }) {
  return (
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
          <i className="tc-swatch tc-swatch--control" /> {control}
        </span>
        <span>
          <i className="tc-swatch tc-swatch--voice" /> {voice}
        </span>
      </figcaption>
    </figure>
  );
}

const Taut = () => <span className="tc-glyph i-verdigris">│</span>;
const Sag = () => <span className="tc-glyph i-brass">╎</span>;
const Fray = () => <span className="tc-glyph i-alarm">┆</span>;

const N0 = <a href="https://n0.computer">Number Zero</a>;
const ISSUE = <a href={`${REPO}/issues/136`}>issue #136</a>;
const STORY_EN = "/blog/tincan-serverless-voice-chat-in-terminal";
const STORY_TR = "/blog/tincan-terminalde-sesli-sohbet";
const DESIGN_NOTES = `${REPO}/blob/main/docs/wiki/9-Interface-Design.md`;
const BREW = "brew tap bilalyazicioglu/tap && brew install tincan";

/* --- English ------------------------------------------------------------- */

const en: Copy = {
  meta: {
    title: "tincan — Serverless P2P Voice Chat | Discord Alternative",
    ogTitle: "tincan — Serverless P2P Voice Chat & Discord Alternative",
    description:
      "tincan is serverless peer-to-peer voice and text chat for your terminal: an open-source Discord alternative with no accounts, no port forwarding and no VPN.",
    keywords: [
      "discord alternative",
      "serverless voice chat",
      "p2p voice chat",
      "terminal voice chat",
      "open source discord alternative",
      "ratatui",
      "rust voice chat",
      "iroh",
      "peer to peer chat",
    ],
    locale: "en_US",
    imageAlt: "The tincan terminal interface",
    pageName: "tincan — serverless peer-to-peer voice chat for the terminal",
    videoName: "tincan in a real terminal",
    videoDescription:
      "A 12-second screen recording of tincan: audio meters, the latency pulse travelling down the string, chat, and the audio settings screen.",
    crumbs: ["Home", "Projects"],
  },
  ui: {
    nav: "tincan links",
    other: { href: "/tincan/tr", lang: "tr", label: "Türkçe" },
    leaving: "(opens github.com)",
    license: "MIT licensed",
    ratatui: "Built with Ratatui",
  },
  hero: {
    title: ["Two cans", "and a string."],
    says: (
      <>
        tincan: serverless <span className="tc-nowrap">peer-to-peer</span> voice chat for
        your terminal
      </>
    ),
    lead: "Voice and text chat with no server in the middle. Open a room, send your friends the code it prints, and talk.",
  },
  cans: ["you", "them"],
  legs: {
    open: {
      title: "Open a room, hand out two words.",
      body: (
        <>
          <p>
            The first person to run tincan opens the room. It prints a room name
            and a passphrase, and that is all anyone else needs: two things short
            enough to read down the phone.
          </p>
          <RoomShell />
          <p>
            Leave the room name out and you get a 63-character invite code
            instead: the host&apos;s public key, already on your clipboard. No
            accounts, no port forwarding, no VPN.
          </p>
        </>
      ),
    },
    planes: {
      title: "Voice goes straight between you.",
      body: (
        <>
          <p>
            Whoever opens the room keeps the roster, the channels and the chat,
            which comes to a few hundred bytes a second. Voice never goes through
            them. Everyone in a channel sends Opus packets directly to everyone
            else as QUIC datagrams, so the host&apos;s connection is never the
            bottleneck.
          </p>
          <PlanesFigure control="roster and chat, through the host" voice="voice, peer to peer" />
          <p className="tc-aside">A six-person room needs about 160 kbps of upload each.</p>
        </>
      ),
    },
    secret: {
      title: "The passphrase never goes over the wire.",
      body: (
        <>
          <p>
            Both sides stretch it with Argon2id into an admission key. The host
            sends a fresh nonce; the guest answers with a keyed BLAKE2b MAC of it.
            An answer caught in transit is useless on the next connection, and
            nobody can make the host burn Argon2 work by knocking.
          </p>
          <p>
            The passphrase decides who gets in. Keeping what is said private is
            QUIC&apos;s job: every connection is encrypted end to end, and each
            side is checked against its public key.
          </p>
        </>
      ),
    },
    relay: {
      title: "When the direct path fails, the string sags.",
      body: (
        <>
          <p>
            Two machines behind routers usually punch through to each other. When
            they can&apos;t, the traffic goes through a relay. The relay forwards
            packets it has no key for. It can see which two keys are talking, when
            and how much, but never what is said.
          </p>
          <p>
            In tincan, the line between the channel list and the chat behaves like
            the one on this page. It runs taut <Taut /> when everyone is reached
            directly, sags <Sag /> through a relay, and frays <Fray /> when audio
            starts dropping. While someone talks, a pulse runs down it at the speed
            of the round trip, so you see a slow link before you read about it.
          </p>
        </>
      ),
    },
    limits: {
      title: "What it can't do without.",
      body: (
        <>
          <p>
            Serverless means there is no tincan server: no account, no room
            registry, and no copy of your conversation anywhere but on the machines
            having it. It doesn&apos;t mean no infrastructure. Peers find each
            other through the DNS and relays run by {N0}, the company behind iroh.
            If those went away, new connections would stop working. Pointing
            tincan at your own relay is {ISSUE}.
          </p>
          <p>
            Being reachable also means being found. Everyone in a room learns
            everyone else&apos;s IP address. With a real tin-can phone, the other
            end knows where you are too.
          </p>
        </>
      ),
    },
    real: {
      title: "Recorded, not rendered.",
      body: (
        <>
          <p>
            The terminal at the top of this page is an imitation written for it.
            This is tincan itself, recorded in a real terminal.
          </p>
          <DemoLoop />
        </>
      ),
    },
    blocked: {
      title: "When Discord is blocked.",
      body: (
        <p>
          When Discord is blocked in your country, down for everyone, or filtered
          on a school or office network, tincan has nothing of its own to take
          down with it. There is no tincan domain or server address for a provider
          to blacklist: peers find each other through iroh&apos;s discovery
          service and talk directly over encrypted QUIC. A network that blocks
          those services, or all UDP, stops it too.
        </p>
      ),
    },
  },
  compare: {
    title: "tincan, Discord and Mumble.",
    lead: "Discord keeps everything on its servers; Mumble and TeamSpeak need someone to run one. tincan has no server at all.",
    caption: "tincan compared with Discord and with TeamSpeak or Mumble",
    rows: [
      ["Where voice goes", "Directly between peers", "Discord's voice servers", "The server"],
      ["Server to run or rent", "None", "Discord's", "Yours"],
      ["What a network must block", "iroh discovery and relays, or UDP", "Discord's domains", "The server's address"],
      ["Account", "None", "Email or phone", "Optional"],
      ["Chat history kept on", "The machines in the room", "Discord's servers", "The server, if enabled"],
      ["Client", "Native terminal app (Rust)", "Electron app", "Native desktop app"],
      ["Source", "Open, MIT", "Closed", "TeamSpeak closed, Mumble BSD"],
    ],
  },
  faq: {
    title: "Questions.",
    items: [
      {
        q: "Does tincan work when Discord is blocked?",
        a: "Usually, yes. Blocking Discord means blocking Discord's domains and servers, and tincan has no server of its own to block. Peers find each other through iroh's public discovery service and relays, run by Number Zero, and voice goes directly between the machines over encrypted QUIC. A network that blocks those services, or all UDP traffic, stops tincan too.",
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
        a: `Install it with Homebrew (\`${BREW}\`), Cargo (\`cargo install tincan-chat\`) or npm (\`npm install -g tincan-cli\`). Then run \`tincan host lobby\` to open a room and \`tincan join lobby\` to join it.`,
      },
      {
        q: "Is tincan free?",
        a: "Yes. tincan is open source under the MIT license, and there is no paid tier, because there is no service to pay for.",
      },
    ],
  },
  end: {
    title: "Their end.",
    lead: "Install it, open a room, and send them the code.",
    links: (
      <>
        <li>
          <a href={REPO}>Source on GitHub</a>
        </li>
        <li>
          <Link href={STORY_EN}>The story behind it</Link>{" "}
          <Link href={STORY_TR} lang="tr" hrefLang="tr" className="tc-alt">
            (Türkçe)
          </Link>
        </li>
        <li>
          <a href={DESIGN_NOTES}>Interface design notes</a>
        </li>
        <li>
          <a href="https://crates.io/crates/tincan-chat">crates.io</a>
        </li>
        <li>
          <a href="https://www.npmjs.com/package/tincan-cli">npm</a>
        </li>
      </>
    ),
  },
  foot: (
    <>
      tincan is MIT licensed and made by <Link href="/">{siteConfig.heroName}</Link>.
    </>
  ),
};

/* --- Türkçe -------------------------------------------------------------- */

const tr: Copy = {
  meta: {
    title: "tincan — Sunucusuz P2P Sesli Sohbet | Discord Alternatifi",
    ogTitle: "tincan — Sunucusuz P2P Sesli Sohbet ve Discord Alternatifi",
    description:
      "tincan, terminal için sunucusuz, eşler arası (P2P) sesli ve yazılı sohbet: hesap, port yönlendirme ve VPN gerektirmeyen açık kaynaklı bir Discord alternatifi.",
    keywords: [
      "discord alternatifi",
      "discord engeli",
      "sunucusuz sesli sohbet",
      "p2p sesli sohbet",
      "terminal sesli sohbet",
      "açık kaynak discord alternatifi",
      "vpn'siz sesli sohbet",
      "rust",
      "ratatui",
    ],
    locale: "tr_TR",
    imageAlt: "tincan'ın terminal arayüzü",
    pageName: "tincan — terminal için sunucusuz, eşler arası sesli sohbet",
    videoName: "Gerçek bir terminalde tincan",
    videoDescription:
      "tincan'ın 12 saniyelik ekran kaydı: ses göstergeleri, ip boyunca ilerleyen gecikme nabzı, sohbet ve ses ayarları ekranı.",
    crumbs: ["Ana sayfa", "Projeler"],
  },
  ui: {
    nav: "tincan bağlantıları",
    other: { href: "/tincan", lang: "en", label: "English" },
    leaving: "(github.com'u açar)",
    license: "MIT lisanslı",
    ratatui: "Ratatui ile yapıldı",
  },
  hero: {
    title: ["İki teneke,", "bir ip."],
    says: (
      <>
        tincan: terminal için sunucusuz, <span className="tc-nowrap">eşler arası</span> sesli
        sohbet
      </>
    ),
    lead: "Arada sunucu olmadan sesli ve yazılı sohbet. Bir oda aç, ekrana basılan kodu arkadaşlarına gönder ve konuş.",
  },
  cans: ["sen", "onlar"],
  legs: {
    open: {
      title: "Bir oda aç, iki kelime ver.",
      body: (
        <>
          <p>
            tincan&apos;ı ilk çalıştıran kişi odayı açar. Ekrana bir oda adı ve bir
            parola basılır; başka herkesin ihtiyacı olan tek şey bunlar: telefonda
            okunacak kadar kısa iki şey.
          </p>
          <RoomShell />
          <p>
            Oda adını vermezsen yerine 63 karakterlik bir davet kodu alırsın:
            host&apos;un açık anahtarı, çoktan panonda. Hesap yok, port yönlendirme
            yok, VPN yok.
          </p>
        </>
      ),
    },
    planes: {
      title: "Ses doğrudan aranızda gider.",
      body: (
        <>
          <p>
            Odayı açan kişi katılımcı listesini, kanalları ve sohbeti tutar; bu
            saniyede birkaç yüz bayt eder. Ses ondan hiç geçmez. Bir kanaldaki herkes
            Opus paketlerini QUIC datagramları olarak doğrudan diğer herkese gönderir,
            bu yüzden host&apos;un bağlantısı hiçbir zaman darboğaz olmaz.
          </p>
          <PlanesFigure control="liste ve sohbet, host üzerinden" voice="ses, eşten eşe" />
          <p className="tc-aside">Altı kişilik bir oda, kişi başı yaklaşık 160 kbps yükleme ister.</p>
        </>
      ),
    },
    secret: {
      title: "Parola asla ağdan geçmez.",
      body: (
        <>
          <p>
            İki taraf da parolayı Argon2id ile bir giriş anahtarına dönüştürür. Host
            taze bir nonce gönderir; misafir buna anahtarlı bir BLAKE2b MAC ile cevap
            verir. Yolda yakalanan bir cevap sonraki bağlantıda işe yaramaz ve kimse
            kapıyı çalarak host&apos;a Argon2 hesabı yaptıramaz.
          </p>
          <p>
            Parola kimin gireceğine karar verir. Konuşulanı gizli tutmak QUIC&apos;in
            işi: her bağlantı uçtan uca şifrelenir ve her taraf kendi açık anahtarıyla
            doğrulanır.
          </p>
        </>
      ),
    },
    relay: {
      title: "Doğrudan yol kurulamazsa ip sarkar.",
      body: (
        <>
          <p>
            Router arkasındaki iki bilgisayar çoğu zaman birbirine delik açıp
            ulaşır. Ulaşamazsa trafik bir relay üzerinden gider. Relay, anahtarı
            olmadığı paketleri yalnızca iletir: hangi iki anahtarın ne zaman ve ne
            kadar konuştuğunu görür, ama ne konuşulduğunu asla.
          </p>
          <p>
            tincan&apos;da kanal listesiyle sohbet arasındaki çizgi, bu sayfadaki
            gibi davranır. Herkese doğrudan ulaşıldığında gergin durur <Taut />,
            relay üzerinden gidildiğinde sarkar <Sag />, ses kopmaya başladığında
            yıpranır <Fray />. Biri konuşurken çizgi boyunca, gidiş-dönüş süresinin
            hızında bir nabız akar; yavaş bir bağlantıyı okumadan önce görürsün.
          </p>
        </>
      ),
    },
    limits: {
      title: "Neye dayandığı.",
      body: (
        <>
          <p>
            Sunucusuz, bir tincan sunucusu olmadığı anlamına gelir: hesap yok, oda
            kaydı yok ve konuşmanın, onu yapan bilgisayarlar dışında hiçbir yerde
            kopyası yok. Hiç altyapı olmadığı anlamına gelmez. Eşler birbirini,
            iroh&apos;un arkasındaki şirket olan {N0}&apos;nun işlettiği DNS ve
            relay sunucuları üzerinden bulur. Bunlar ortadan kalkarsa yeni
            bağlantılar kurulamaz. tincan&apos;ı kendi relay&apos;ine yönlendirmek{" "}
            {ISSUE}&apos;da.
          </p>
          <p>
            Ulaşılabilir olmak, bulunabilir olmak demek. Bir odadaki herkes diğer
            herkesin IP adresini öğrenir. Gerçek bir teneke kutu telefonda da karşı
            uç nerede olduğunu bilir.
          </p>
        </>
      ),
    },
    real: {
      title: "Çizilmedi, kaydedildi.",
      body: (
        <>
          <p>
            Sayfanın başındaki terminal, bu sayfa için yazılmış bir taklit. Bu ise
            gerçek bir terminalde kaydedilmiş tincan&apos;ın kendisi.
          </p>
          <DemoLoop lang="tr" />
        </>
      ),
    },
    blocked: {
      title: "Discord engellendiğinde.",
      body: (
        <p>
          Discord ülkende engellendiğinde, herkes için çöktüğünde ya da okulun veya
          işyerinin ağında filtrelendiğinde, tincan&apos;ın onunla birlikte
          kapanacak bir şeyi yok. Servis sağlayıcının kara listeye alacağı bir
          tincan alan adı ya da sunucu adresi yok: eşler birbirini iroh&apos;un
          keşif servisiyle bulur ve doğrudan, şifreli QUIC üzerinden konuşur. Çoğu
          durumda VPN gerekmez. Bu servisleri ya da tüm UDP trafiğini engelleyen
          bir ağ ise tincan&apos;ı da durdurur.
        </p>
      ),
    },
  },
  compare: {
    title: "tincan, Discord ve Mumble.",
    lead: "Discord her şeyi kendi sunucularında tutar; Mumble ve TeamSpeak için birinin sunucu çalıştırması gerekir. tincan'ın hiç sunucusu yok.",
    caption: "tincan'ın Discord ve TeamSpeak ya da Mumble ile karşılaştırması",
    rows: [
      ["Ses nereden geçer", "Doğrudan eşler arasında", "Discord'un ses sunucuları", "Sunucu"],
      ["Kurulacak ya da kiralanacak sunucu", "Yok", "Discord'unki", "Seninki"],
      ["Bir ağın engellemesi gereken", "iroh keşif ve relay servisleri ya da UDP", "Discord'un alan adları", "Sunucunun adresi"],
      ["Hesap", "Yok", "E-posta ya da telefon", "İsteğe bağlı"],
      ["Sohbet geçmişi nerede", "Odadaki bilgisayarlarda", "Discord'un sunucularında", "Sunucuda, açıksa"],
      ["İstemci", "Yerel terminal uygulaması (Rust)", "Electron uygulaması", "Yerel masaüstü uygulaması"],
      ["Kaynak kodu", "Açık, MIT", "Kapalı", "TeamSpeak kapalı, Mumble BSD"],
    ],
  },
  faq: {
    title: "Sorular.",
    items: [
      {
        q: "Discord engelliyken tincan çalışır mı? VPN gerekir mi?",
        a: "Çoğu durumda VPN gerekmez. Discord erişim engeli Discord'un alan adlarını ve sunucularını hedefler; tincan'ın ise engellenecek kendi sunucusu yok. Eşler birbirini iroh'un açık keşif servisi ve Number Zero'nun relay sunucuları üzerinden bulur, ses doğrudan iki bilgisayar arasında şifreli QUIC ile akar. Bu servisleri ya da tüm UDP trafiğini engelleyen bir ağda tincan da çalışmaz.",
      },
      {
        q: "Hesap, e-posta ya da telefon numarası gerekir mi?",
        a: "Hayır. Kaydolacak ya da giriş yapacak bir şey yok. Bir oda açarsın ve ya adını ile dört kelimelik parolasını ya da 63 karakterlik bir davet kodunu paylaşırsın. Her bilgisayar bir açık anahtarla tanınır ve konuşmanın, onu yapan bilgisayarlar dışında hiçbir yerde kopyası tutulmaz.",
      },
      {
        q: "tincan şifreli mi?",
        a: "Her bağlantı QUIC'tir: iki ucundaki bilgisayar arasında şifrelenir ve karşı tarafın açık anahtarıyla doğrulanır. Ses doğrudan eşten eşe gider; sohbet ve katılımcı listesi ise odadakilerden biri olan host üzerinden geçer. Relay'ler okuyamadıkları paketleri iletir, ama hangi anahtarların ne zaman ve ne kadar konuştuğunu görebilir. Bir odadaki herkes diğer herkesin IP adresini öğrenir.",
      },
      {
        q: "Ses kalitesi nasıl, ne kadar internet harcar?",
        a: "Ses, 48 kHz mono ve 32 kbps Opus olarak 20 ms'lik parçalar halinde gönderilir; mikrofonunda RNNoise gürültü bastırma çalışır. Gürültü bastırma 10 ms gecikme ekler ve ses ayarları ekranından kapatılabilir. Altı kişilik bir oda, kişi başı yaklaşık 160 kbps yükleme ister.",
      },
      {
        q: "Oyun oynarken ya da kod yazarken açık bırakabilir miyim?",
        a: "Evet. tincan bir terminal sekmesinde çalışan yerel bir Rust programı, Electron uygulaması değil. Bas-konuş için `--ptt` ile başlat (F4 tuşu), yalnızca yazılı sohbet için `--no-voice` kullan.",
      },
      {
        q: "Windows'ta çalışır mı?",
        a: "Günlük kullanımı macOS ve Linux'ta. Windows sürümü CI'da derlenip test ediliyor ama henüz gerçek bir Windows makinesinde kullanılmadı. `npx tincan-cli host` ile deneyebilir ya da GitHub'daki son sürümden zip dosyasını indirebilirsin.",
      },
      {
        q: "tincan nasıl kurulur, oda nasıl açılır?",
        a: `macOS ve Linux'ta Homebrew ile (\`${BREW}\`), Rust varsa \`cargo install tincan-chat\` ile, Node varsa \`npm install -g tincan-cli\` ile kurabilirsin. Sonra oda açmak için \`tincan host lobby\`, katılmak için \`tincan join lobby\` yazman yeterli.`,
      },
      {
        q: "tincan ücretsiz mi?",
        a: "Evet. tincan MIT lisanslı açık kaynak bir proje ve ücretli bir sürümü yok, çünkü parası ödenecek bir servis yok.",
      },
    ],
  },
  end: {
    title: "Karşı uç.",
    lead: "Kur, bir oda aç ve kodu onlara gönder.",
    links: (
      <>
        <li>
          <a href={REPO}>GitHub&apos;da kaynak kodu</a>
        </li>
        <li>
          <Link href={STORY_TR}>Arkasındaki hikâye</Link>{" "}
          <Link href={STORY_EN} lang="en" hrefLang="en" className="tc-alt">
            (English)
          </Link>
        </li>
        <li>
          <a href={DESIGN_NOTES} hrefLang="en">
            Arayüz tasarım notları (İngilizce)
          </a>
        </li>
        <li>
          <a href="https://crates.io/crates/tincan-chat">crates.io</a>
        </li>
        <li>
          <a href="https://www.npmjs.com/package/tincan-cli">npm</a>
        </li>
      </>
    ),
  },
  foot: (
    <>
      tincan MIT lisanslıdır; <Link href="/">{siteConfig.heroName}</Link> tarafından yapıldı.
    </>
  ),
};

export const COPY: Record<Lang, Copy> = { en, tr };
