"use client";

import { useState } from "react";

type Section = "frontmatter" | "headings" | "code" | "lists_tables" | "media";

const snippets: Record<Section, { title: string; desc: string; code: string }[]> = {
  frontmatter: [
    {
      title: "Standard Post Frontmatter",
      desc: "Yazıların en başında yer alan metadata başlığı",
      code: `---
title: "Yeni Nesil Dağıtık Sistemler"
summary: "Rust ve QUIC protokolü ile yüksek performanslı veri iletimi mimarisi."
date: "2026-09-14"
tags: ["Rust", "P2P", "Distributed Systems"]
lang: "tr"
draft: false
---`,
    },
    {
      title: "English Post Frontmatter",
      desc: "İngilizce yazılar için dil ve etiket ayarı",
      code: `---
title: "Understanding Peer-to-Peer Networks"
summary: "An in-depth exploration of NAT traversal and decentralized routing."
date: "2026-09-14"
tags: ["Networking", "P2P", "Architecture"]
lang: "en"
draft: true
---`,
    },
  ],
  headings: [
    {
      title: "Başlıklar & Tipografi",
      desc: "Blog şablonunda h2 ve h3 UI fontunda büyük harf olarak biçimlendirilir",
      code: `## BÖLÜM BAŞLIĞI (H2)
Bu bir ana bölüm başlangıcıdır.

### Alt Başlık (H3)
Bu bir alt detay başlığıdır.

Bu satır normal gövde metnidir. **Kalın metin**, *italik metin* ve \`satır içi kod\`.`,
    },
    {
      title: "Alıntılar & Vurgu Blokları",
      desc: "Önemli notlar ve alıntılar için blok tırnak",
      code: `> **Önemli Not:** Dağıtık sistemlerde ağ gecikmesini minimize etmek için
> QUIC protokolünün 0-RTT handshake avantajı kullanılır.`,
    },
  ],
  code: [
    {
      title: "Rust Kod Bloğu",
      desc: "Rust dilinde kod örneği",
      code: `\`\`\`rust
use std::net::SocketAddr;
use tokio::net::UdpSocket;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let socket = UdpSocket::bind("127.0.0.1:8080").await?;
    println!("Server listening on 8080");
    Ok(())
}
\`\`\``,
    },
    {
      title: "TypeScript / Bash Blokları",
      desc: "Frontend ve terminal komutları",
      code: `\`\`\`bash
# Servisi başlat
cargo run --release
\`\`\`

\`\`\`ts
export function calculateLatency(start: number): number {
  return performance.now() - start;
}
\`\`\``,
    },
  ],
  lists_tables: [
    {
      title: "Madde İmleri & Listeler",
      desc: "Sıralı ve sırasız listeler",
      code: `- İlk madde
- İkinci madde
  - İç içe alt madde
- Üçüncü madde

1. Adım bir
2. Adım iki
3. Adım üç`,
    },
    {
      title: "Markdown Tablosu",
      desc: "Performans ve karşılaştırma tabloları",
      code: `| Protokol | Gecikme (ms) | Şifreleme | Handshake |
| :--- | :---: | :---: | :--- |
| TCP+TLS 1.3 | 42ms | Var | 1-RTT |
| QUIC | 18ms | Yerleşik | 0-RTT |
| Raw UDP | 8ms | Yok | 0-RTT |`,
    },
  ],
  media: [
    {
      title: "Görsel Ekleme",
      desc: "Editör üzerinden yüklenen veya harici görseller",
      code: `![Mimari Diyagram](/uploads/blog/architecture-diagram.webp)
*Şekil 1: P2P düğümlerinin ağ topolojisi ve veri akış yönü.*`,
    },
    {
      title: "Bağlantı (Link)",
      desc: "Metin içi link verme",
      code: `Daha fazla bilgi için [ARpoly projesini](https://arpoly.com) inceleyebilirsiniz.`,
    },
  ],
};

export function MdxCheatsheetModal({
  isOpen,
  onClose,
  onInsert,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (code: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<Section>("frontmatter");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  function copyCode(code: string, idx: number) {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col border-[2px] border-ink bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-[1.5px] border-ink bg-canvas px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            <h3 className="font-display text-base tracking-wider sm:text-lg">
              MDX_CHEATSHEET
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-ink/30 px-2 py-1 font-ui text-xs font-bold uppercase transition-colors hover:bg-ink hover:text-surface"
          >
            ✕ Kapat [ESC]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-ink/15 bg-canvas/40 px-2 pt-2">
          {(
            [
              ["frontmatter", "Frontmatter"],
              ["headings", "Başlık & Metin"],
              ["code", "Kod Blokları"],
              ["lists_tables", "Liste & Tablo"],
              ["media", "Görsel & Link"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap border-b-2 px-4 py-2 font-ui text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === key
                  ? "border-accent text-accent"
                  : "border-transparent text-ink/60 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {snippets[activeTab].map((item, idx) => (
            <div key={idx} className="rounded-none border border-ink/20 bg-canvas/60 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-ui text-sm font-bold text-ink">{item.title}</h4>
                  <p className="font-ui text-xs text-ink/60">{item.desc}</p>
                </div>
                <div className="flex gap-2">
                  {onInsert && (
                    <button
                      type="button"
                      onClick={() => {
                        onInsert(item.code);
                        onClose();
                      }}
                      className="border border-ink bg-ink px-2.5 py-1 font-ui text-[11px] font-bold uppercase text-surface transition-colors hover:bg-accent hover:text-accent-ink"
                    >
                      + Editöre Ekle
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => copyCode(item.code, idx)}
                    className="border border-ink/30 bg-surface px-2.5 py-1 font-ui text-[11px] font-bold uppercase transition-colors hover:border-ink"
                  >
                    {copiedIndex === idx ? "✓ Kopyalandı" : "Kopyala"}
                  </button>
                </div>
              </div>
              <pre className="overflow-x-auto rounded-none border border-ink/10 bg-ink p-3 font-terminal text-xs text-surface">
                <code>{item.code}</code>
              </pre>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-ink/15 bg-canvas/60 px-4 py-2 text-right">
          <p className="font-ui text-[11px] text-ink/50">
            Tüm yazılar <code className="text-accent">src/content/blog/*.mdx</code> formatıyla tam uyumludur.
          </p>
        </div>
      </div>
    </div>
  );
}
