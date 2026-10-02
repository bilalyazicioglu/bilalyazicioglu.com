"use client";

import { useState } from "react";
import type { Lang } from "@/components/tincan/copy";

type PeerId = "you" | "alice" | "bob";

const TEXTS = {
  en: {
    selectSpeaker: "Choose speaker",
    coordBadge: "host",
    peerBadge: "peer",
    speakingBadge: "SPEAKING",
    listeningBadge: "listening",
    legendVoice: "voice stream (Opus / direct QUIC)",
    legendLink: "direct P2P link",
    legendControl: "coordinator (0 voice relay)",
    logHeader: "PROTOCOL TRACE // PEER-TO-PEER AUDIO MESH",
    logVoice: "VOICE",
    logHost: "HOST ",
    directVia: "──direct──>",
    datagramInfo: "QUIC datagram (direct P2P)",
    hostZeroRelayDesktop: "0 packets routed through host",
    hostDirectSendDesktop: "voice sent direct to peers (serverless)",
    hostRelayLabel: "host relay",
    packetsLabel: "packets",
  },
  tr: {
    selectSpeaker: "Konuşan eşi seçin",
    coordBadge: "host",
    peerBadge: "eş",
    speakingBadge: "KONUŞUYOR",
    listeningBadge: "dinliyor",
    legendVoice: "ses akışı (Opus / doğrudan QUIC)",
    legendLink: "doğrudan eşten eşe bağlantı",
    legendControl: "koordinatör (0 ses aktarımı)",
    logHeader: "PROTOKOL İZLEME // EŞTEN EŞE SES AĞI",
    logVoice: "SES  ",
    logHost: "HOST ",
    directVia: "──doğrudan──>",
    datagramInfo: "QUIC datagramı (eşten eşe)",
    hostZeroRelayDesktop: "host üzerinden 0 paket aktarıldı",
    hostDirectSendDesktop: "ses doğrudan eşlere iletildi (sunucusuz)",
    hostRelayLabel: "host aktarımı",
    packetsLabel: "paket",
  },
} as const;

export function MeshVisualizer({ lang = "en" }: { lang?: Lang }) {
  const [activeSpeaker, setActiveSpeaker] = useState<PeerId>("bob");
  const t = TEXTS[lang];

  const peers: { id: PeerId; name: string; isCoordinator: boolean }[] = [
    { id: "you", name: lang === "tr" ? "Sen" : "You", isCoordinator: true },
    { id: "alice", name: "Alice", isCoordinator: false },
    { id: "bob", name: "Bob", isCoordinator: false },
  ];

  // Desktop paths: center coordinates
  // you: (270, 55), alice: (115, 215), bob: (425, 215)
  const desktopPaths: Record<PeerId, { target: PeerId; path: string }[]> = {
    bob: [
      { target: "alice", path: "M 425 215 L 115 215" },
      { target: "you", path: "M 425 215 L 270 55" },
    ],
    alice: [
      { target: "bob", path: "M 115 215 L 425 215" },
      { target: "you", path: "M 115 215 L 270 55" },
    ],
    you: [
      { target: "alice", path: "M 270 55 L 115 215" },
      { target: "bob", path: "M 270 55 L 425 215" },
    ],
  };

  // Mobile paths (compact): center coordinates
  // you: (75, 25), alice: (75, 85), bob: (75, 145)
  // curve between you and bob: starts at right edge (130, y) and curves out to ~200
  const mobilePaths: Record<PeerId, { target: PeerId; path: string }[]> = {
    bob: [
      { target: "alice", path: "M 75 145 L 75 85" },
      { target: "you", path: "M 130 145 C 215 120, 215 50, 130 25" },
    ],
    alice: [
      { target: "you", path: "M 75 85 L 75 25" },
      { target: "bob", path: "M 75 85 L 75 145" },
    ],
    you: [
      { target: "alice", path: "M 75 25 L 75 85" },
      { target: "bob", path: "M 130 25 C 215 50, 215 120, 130 145" },
    ],
  };

  const activeDesktopPaths = desktopPaths[activeSpeaker];
  const activeMobilePaths = mobilePaths[activeSpeaker];

  const speakerName = peers.find((p) => p.id === activeSpeaker)?.name ?? "";
  const listenerPeers = peers.filter((p) => p.id !== activeSpeaker);

  return (
    <figure className="tc-mesh-wrap">
      {/* Top Bar / Speaker Selectors */}
      <div className="tc-mesh-toolbar">
        <span className="tc-mesh-toolbar-label">{t.selectSpeaker}:</span>
        <div className="tc-mesh-tabs" role="tablist" aria-label={t.selectSpeaker}>
          {peers.map((peer) => {
            const isSpeaking = activeSpeaker === peer.id;
            return (
              <button
                key={peer.id}
                type="button"
                role="tab"
                aria-selected={isSpeaking}
                onClick={() => setActiveSpeaker(peer.id)}
                className={`tc-mesh-tab ${isSpeaking ? "tc-mesh-tab--speaking" : ""}`}
              >
                <span className="tc-mesh-tab-dot" aria-hidden="true" />
                <span className="tc-mesh-tab-name">{peer.name}</span>
                <span className="tc-mesh-tab-role">
                  [{peer.isCoordinator ? t.coordBadge : t.peerBadge}]
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="tc-mesh-canvas-wrap">
        {/* DESKTOP TRIANGULAR MESH (>= 640px) */}
        <svg
          viewBox="0 0 540 280"
          className="tc-mesh-svg tc-mesh-svg--desktop"
          aria-hidden="true"
        >
          {/* Static P2P Mesh Connection Lines */}
          <line
            x1="270"
            y1="55"
            x2="115"
            y2="215"
            className="tc-mesh-link tc-mesh-link--base"
          />
          <line
            x1="270"
            y1="55"
            x2="425"
            y2="215"
            className="tc-mesh-link tc-mesh-link--base"
          />
          <line
            x1="115"
            y1="215"
            x2="425"
            y2="215"
            className="tc-mesh-link tc-mesh-link--base"
          />

          {/* Active Voice Paths */}
          {activeDesktopPaths.map((item, idx) => (
            <path
              key={`desktop-active-${idx}-${activeSpeaker}`}
              d={item.path}
              className="tc-mesh-link tc-mesh-link--active"
            />
          ))}

          {/* Moving Voice Packets */}
          {activeDesktopPaths.map((item, idx) => (
            <g key={`desktop-packets-${idx}-${activeSpeaker}`} className="tc-mesh-packet-group">
              <circle r="4.5" className="tc-mesh-packet tc-mesh-packet--lead">
                <animateMotion path={item.path} dur="1.3s" repeatCount="indefinite" />
              </circle>
              <circle r="3" className="tc-mesh-packet tc-mesh-packet--trail">
                <animateMotion
                  path={item.path}
                  dur="1.3s"
                  begin="0.65s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}

          {/* Destination Arrival Pulses */}
          {activeDesktopPaths.map((item) => {
            const coords =
              item.target === "you"
                ? { x: 270, y: 55 }
                : item.target === "alice"
                  ? { x: 115, y: 215 }
                  : { x: 425, y: 215 };
            return (
              <circle
                key={`desktop-arrival-${item.target}-${activeSpeaker}`}
                cx={coords.x}
                cy={coords.y}
                r="28"
                className="tc-mesh-pulse-arrival"
              />
            );
          })}

          {/* Speaking Peer Ripple */}
          <circle
            cx={activeSpeaker === "you" ? 270 : activeSpeaker === "alice" ? 115 : 425}
            cy={activeSpeaker === "you" ? 55 : 215}
            r="28"
            className="tc-mesh-pulse-speaking"
          />

          {/* Desktop Nodes */}
          {/* Node 1: You (Coordinator) */}
          <g
            className={`tc-mesh-node ${activeSpeaker === "you" ? "tc-mesh-node--speaking" : ""}`}
            onClick={() => setActiveSpeaker("you")}
          >
            <rect
              x="208"
              y="32"
              width="124"
              height="46"
              rx="6"
              className="tc-mesh-node-box"
            />
            <circle
              cx="223"
              cy="55"
              r="4.5"
              className={activeSpeaker === "you" ? "i-dot-brass" : "i-dot-patina"}
            />
            <text x="236" y="50" className="tc-mesh-node-title">
              {lang === "tr" ? "Sen" : "You"}
              <tspan className="tc-mesh-node-role"> [{t.coordBadge}]</tspan>
            </text>
            <text x="236" y="66" className="tc-mesh-node-status">
              {activeSpeaker === "you" ? t.speakingBadge : t.listeningBadge}
            </text>
          </g>

          {/* Node 2: Alice */}
          <g
            className={`tc-mesh-node ${activeSpeaker === "alice" ? "tc-mesh-node--speaking" : ""}`}
            onClick={() => setActiveSpeaker("alice")}
          >
            <rect
              x="53"
              y="192"
              width="124"
              height="46"
              rx="6"
              className="tc-mesh-node-box"
            />
            <circle
              cx="68"
              cy="215"
              r="4.5"
              className={activeSpeaker === "alice" ? "i-dot-brass" : "i-dot-patina"}
            />
            <text x="81" y="210" className="tc-mesh-node-title">
              Alice
              <tspan className="tc-mesh-node-role"> [{t.peerBadge}]</tspan>
            </text>
            <text x="81" y="226" className="tc-mesh-node-status">
              {activeSpeaker === "alice" ? t.speakingBadge : t.listeningBadge}
            </text>
          </g>

          {/* Node 3: Bob */}
          <g
            className={`tc-mesh-node ${activeSpeaker === "bob" ? "tc-mesh-node--speaking" : ""}`}
            onClick={() => setActiveSpeaker("bob")}
          >
            <rect
              x="363"
              y="192"
              width="124"
              height="46"
              rx="6"
              className="tc-mesh-node-box"
            />
            <circle
              cx="378"
              cy="215"
              r="4.5"
              className={activeSpeaker === "bob" ? "i-dot-brass" : "i-dot-patina"}
            />
            <text x="391" y="210" className="tc-mesh-node-title">
              Bob
              <tspan className="tc-mesh-node-role"> [{t.peerBadge}]</tspan>
            </text>
            <text x="391" y="226" className="tc-mesh-node-status">
              {activeSpeaker === "bob" ? t.speakingBadge : t.listeningBadge}
            </text>
          </g>
        </svg>

        {/* MOBILE COMPACT VERTICAL/BRANCHED LAYOUT (< 640px) */}
        <svg
          viewBox="0 0 260 170"
          className="tc-mesh-svg tc-mesh-svg--mobile"
          aria-hidden="true"
        >
          {/* Vertical Direct Links */}
          <line x1="75" y1="25" x2="75" y2="85" className="tc-mesh-link tc-mesh-link--base" />
          <line x1="75" y1="85" x2="75" y2="145" className="tc-mesh-link tc-mesh-link--base" />

          {/* Curved Direct Bypass Link: You <---> Bob */}
          <path
            d="M 130 25 C 215 50, 215 120, 130 145"
            className="tc-mesh-link tc-mesh-link--base"
          />

          {/* Active Mobile Voice Paths */}
          {activeMobilePaths.map((item, idx) => (
            <path
              key={`mobile-active-${idx}-${activeSpeaker}`}
              d={item.path}
              className="tc-mesh-link tc-mesh-link--active"
            />
          ))}

          {/* Mobile Moving Voice Packets */}
          {activeMobilePaths.map((item, idx) => (
            <g key={`mobile-packets-${idx}-${activeSpeaker}`} className="tc-mesh-packet-group">
              <circle r="3.5" className="tc-mesh-packet tc-mesh-packet--lead">
                <animateMotion path={item.path} dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle r="2.5" className="tc-mesh-packet tc-mesh-packet--trail">
                <animateMotion
                  path={item.path}
                  dur="1.2s"
                  begin="0.6s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}

          {/* Mobile Arrival Pulses */}
          {activeMobilePaths.map((item) => {
            const coords =
              item.target === "you"
                ? { x: 75, y: 25 }
                : item.target === "alice"
                  ? { x: 75, y: 85 }
                  : { x: 75, y: 145 };
            return (
              <circle
                key={`mobile-arrival-${item.target}-${activeSpeaker}`}
                cx={coords.x}
                cy={coords.y}
                r="18"
                className="tc-mesh-pulse-arrival"
              />
            );
          })}

          {/* Mobile Speaking Peer Ripple */}
          <circle
            cx={75}
            cy={activeSpeaker === "you" ? 25 : activeSpeaker === "alice" ? 85 : 145}
            r="18"
            className="tc-mesh-pulse-speaking"
          />

          {/* Mobile Node 1: You */}
          <g
            className={`tc-mesh-node ${activeSpeaker === "you" ? "tc-mesh-node--speaking" : ""}`}
            onClick={() => setActiveSpeaker("you")}
          >
            <rect
              x="20"
              y="9"
              width="110"
              height="32"
              rx="5"
              className="tc-mesh-node-box"
            />
            <circle
              cx="32"
              cy="25"
              r="3.5"
              className={activeSpeaker === "you" ? "i-dot-brass" : "i-dot-patina"}
            />
            <text x="42" y="29" className="tc-mesh-node-title">
              {lang === "tr" ? "Sen" : "You"}
              <tspan className="tc-mesh-node-role">
                {" "}[{activeSpeaker === "you" ? t.speakingBadge : t.coordBadge}]
              </tspan>
            </text>
          </g>

          {/* Mobile Node 2: Alice */}
          <g
            className={`tc-mesh-node ${activeSpeaker === "alice" ? "tc-mesh-node--speaking" : ""}`}
            onClick={() => setActiveSpeaker("alice")}
          >
            <rect
              x="20"
              y="69"
              width="110"
              height="32"
              rx="5"
              className="tc-mesh-node-box"
            />
            <circle
              cx="32"
              cy="85"
              r="3.5"
              className={activeSpeaker === "alice" ? "i-dot-brass" : "i-dot-patina"}
            />
            <text x="42" y="89" className="tc-mesh-node-title">
              Alice
              <tspan className="tc-mesh-node-role">
                {" "}[{activeSpeaker === "alice" ? t.speakingBadge : t.peerBadge}]
              </tspan>
            </text>
          </g>

          {/* Mobile Node 3: Bob */}
          <g
            className={`tc-mesh-node ${activeSpeaker === "bob" ? "tc-mesh-node--speaking" : ""}`}
            onClick={() => setActiveSpeaker("bob")}
          >
            <rect
              x="20"
              y="129"
              width="110"
              height="32"
              rx="5"
              className="tc-mesh-node-box"
            />
            <circle
              cx="32"
              cy="145"
              r="3.5"
              className={activeSpeaker === "bob" ? "i-dot-brass" : "i-dot-patina"}
            />
            <text x="42" y="149" className="tc-mesh-node-title">
              Bob
              <tspan className="tc-mesh-node-role">
                {" "}[{activeSpeaker === "bob" ? t.speakingBadge : t.peerBadge}]
              </tspan>
            </text>
          </g>
        </svg>
      </div>

      {/* Protocol Event Log below the diagram */}
      <div className="tc-mesh-log">
        <div className="tc-mesh-log-header">{t.logHeader}</div>
        
        {/* Compact Mobile Log (< 640px) */}
        <div className="tc-mesh-log-body tc-mesh-log-body--mobile">
          {listenerPeers.map((targetPeer) => (
            <div key={`mob-log-${targetPeer.id}`} className="tc-mesh-log-row">
              <span className="tc-mesh-log-route">
                {speakerName} {t.directVia} {targetPeer.name}
              </span>
            </div>
          ))}
          <div className="tc-mesh-log-row tc-mesh-log-row--host">
            <span className="tc-mesh-log-host-relay">
              {t.hostRelayLabel}: 0 {t.packetsLabel}
            </span>
          </div>
        </div>

        {/* Detailed Desktop Log (>= 640px) */}
        <div className="tc-mesh-log-body tc-mesh-log-body--desktop">
          {listenerPeers.map((targetPeer) => (
            <div key={`desk-log-${targetPeer.id}`} className="tc-mesh-log-row">
              <span className="tc-mesh-tag-voice">[{t.logVoice}]</span>
              <span className="tc-mesh-log-route">
                {speakerName} {t.directVia} {targetPeer.name}
              </span>
              <span className="tc-mesh-log-detail">{t.datagramInfo}</span>
            </div>
          ))}
          <div className="tc-mesh-log-row tc-mesh-log-row--host">
            <span className="tc-mesh-tag-host">[{t.logHost}]</span>
            <span className="tc-mesh-log-route">
              {lang === "tr" ? "Sen" : "You"} ({t.coordBadge})
            </span>
            <span className="tc-mesh-log-detail">
              {activeSpeaker === "you" ? t.hostDirectSendDesktop : t.hostZeroRelayDesktop}
            </span>
          </div>
        </div>
      </div>

      {/* Caption & Legend (Desktop only, hidden on mobile) */}
      <figcaption className="tc-mesh-legend">
        <span>
          <i className="tc-swatch tc-swatch--voice" /> {t.legendVoice}
        </span>
        <span>
          <i className="tc-swatch tc-swatch--direct" /> {t.legendLink}
        </span>
        <span>
          <i className="tc-swatch tc-swatch--control" /> {t.legendControl}
        </span>
      </figcaption>
    </figure>
  );
}
