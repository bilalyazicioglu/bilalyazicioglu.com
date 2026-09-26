"use client";

import { useId, useState } from "react";

const WAYS = [
  { id: "brew", label: "Homebrew", command: "brew tap bilalyazicioglu/tap && brew install tincan" },
  {
    id: "curl",
    label: "Shell",
    command: "curl -fsSL https://raw.githubusercontent.com/bilalyazicioglu/tincan-cli/main/install.sh | sh",
  },
  { id: "cargo", label: "Cargo", command: "cargo install tincan-chat" },
  // Last on purpose: the npm package is only a wrapper that fetches the same
  // prebuilt binary, and it is not the way terminal people expect to install one.
  { id: "npm", label: "npm", command: "npm install -g tincan-cli" },
] as const;

/** Per language: the tab list's name, the copy button, and a note per way, in WAYS order. */
const WORDS = {
  en: {
    ways: "Ways to install tincan",
    copy: "Copy",
    copied: "Copied",
    notes: [
      "macOS and Linux.",
      "A prebuilt binary into ~/.local/bin, checksum verified.",
      "The crate is tincan-chat; the command is still tincan.",
      "A thin wrapper that downloads the same prebuilt binary and checks its SHA-256.",
    ],
  },
  tr: {
    ways: "tincan'ı kurmanın yolları",
    copy: "Kopyala",
    copied: "Kopyalandı",
    notes: [
      "macOS ve Linux.",
      "Hazır derlenmiş bir binary ~/.local/bin'e iner, checksum'ı doğrulanır.",
      "Crate'in adı tincan-chat; komut yine tincan.",
      "Aynı hazır binary'yi indirip SHA-256'sını doğrulayan ince bir sarmalayıcı.",
    ],
  },
} as const;

export function InstallTabs({ lang = "en" }: { lang?: keyof typeof WORDS }) {
  const words = WORDS[lang];
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const base = useId();
  const way = WAYS[active];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(way.command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* No clipboard permission: the command is selectable text anyway. */
    }
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + WAYS.length) % WAYS.length;
    setActive(next);
    setCopied(false);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  };

  return (
    <div className="tc-install">
      <div role="tablist" aria-label={words.ways} className="tc-install-tabs">
        {WAYS.map((w, i) => (
          <button
            key={w.id}
            id={`${base}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`${base}-panel`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => {
              setActive(i);
              setCopied(false);
            }}
            onKeyDown={(e) => onKey(e, i)}
          >
            {w.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${active}`} className="tc-install-panel">
        <code>
          <span aria-hidden="true" className="tc-prompt">$ </span>
          {way.command}
        </code>
        <button type="button" className="tc-copy" onClick={copy}>
          {copied ? words.copied : words.copy}
        </button>
      </div>
      <p className="tc-install-note">{words.notes[active]}</p>
    </div>
  );
}
