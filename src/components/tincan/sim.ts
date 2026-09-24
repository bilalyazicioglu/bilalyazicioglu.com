/**
 * A browser-sized tincan: the room state the real TUI keeps, and a drawing of it
 * into a character grid the same way ratatui would. No React here — the
 * component owns the clock and the keyboard, this owns what the screen says.
 *
 * Glyphs and colour roles are the ones in tincan's `src/ui/theme.rs`, so the
 * simulation cannot drift into a look the app does not have.
 */

export const G = {
  strand: { idle: "·", taut: "│", slack: "╎", frayed: "┆" },
  pulse: "⟩",
  cursor: "▸",
  onAir: "●",
  meter: ["···", "▁··", "▁▃·", "▁▃▅", "▃▅▇"],
  caret: "▏",
  note: "·",
  cut: "…",
  can: { lid: "( o )", top: "┌─────┐", body: "│     │", bottom: "└─────┘", string: "╌", knot: "◦" },
} as const;

/** Colour roles, named as in the app. Each maps to a CSS class in tincan.css. */
export type Ink =
  | "tin"
  | "zinc"
  | "patina"
  | "verdigris"
  | "brass"
  | "alarm"
  | "dim"
  | "chip-patina"
  | "chip-verdigris"
  | "chip-tin"
  | "chip-dim";

type Cell = { ch: string; ink: Ink; bold: boolean; panel: boolean };

export type Run = { text: string; ink: Ink; bold: boolean; panel: boolean };

export class Screen {
  readonly cells: Cell[][];

  constructor(
    readonly width: number,
    readonly height: number
  ) {
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ ch: " ", ink: "tin" as Ink, bold: false, panel: false }))
    );
  }

  put(x: number, y: number, text: string, ink: Ink = "tin", bold = false) {
    if (y < 0 || y >= this.height) return;
    let col = x;
    for (const ch of text) {
      if (col >= this.width) break;
      if (col >= 0) {
        const cell = this.cells[y][col];
        cell.ch = ch;
        cell.ink = ink;
        cell.bold = bold;
      }
      col++;
    }
  }

  /** Right-aligned so the last character lands on column `right - 1`. */
  putRight(right: number, y: number, text: string, ink: Ink = "tin", bold = false) {
    this.put(right - [...text].length, y, text, ink, bold);
  }

  panel(x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h && row < this.height; row++) {
      for (let col = x; col < x + w && col < this.width; col++) this.cells[row][col].panel = true;
    }
  }

  /** Each row as runs of identical styling, which is what the DOM draws. */
  runs(): Run[][] {
    return this.cells.map((row) => {
      const out: Run[] = [];
      for (const cell of row) {
        const last = out[out.length - 1];
        if (last && last.ink === cell.ink && last.bold === cell.bold && last.panel === cell.panel) {
          last.text += cell.ch;
        } else {
          out.push({ text: cell.ch, ink: cell.ink, bold: cell.bold, panel: cell.panel });
        }
      }
      return out;
    });
  }
}

export const CHANNELS = ["general", "gaming", "music"] as const;

export type Msg = { at: string; who: string; text: string; kind: "chat" | "room" | "code" };

export type Peer = { name: string; you: boolean; channel: number | null; phase: number };

export type Room = {
  /** Whether bob has picked up the other can yet. */
  joined: boolean;
  view: number;
  /** Which channel your voice is in, if any. */
  voice: number | null;
  muted: boolean;
  deaf: boolean;
  input: string;
  msgs: Msg[][];
  unread: boolean[];
  peers: Peer[];
  /** Until when (ms on the room clock) each peer is talking. */
  talking: Record<string, number>;
};

export const INVITE =
  "n73w-kuqc-uog2-7fhe-q3pb-wyxa-4mzt-kc2d-e6vr-h5ln-p0sj-8gai-bt3o";
export const RTT_MS = 18;

export function newRoom(): Room {
  return {
    joined: false,
    view: 0,
    voice: 0,
    muted: false,
    deaf: false,
    input: "",
    msgs: [[], [], []],
    unread: [false, false, false],
    peers: [{ name: "alice", you: true, channel: 0, phase: 0 }],
    talking: {},
  };
}

export function clock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function say(room: Room, channel: number, msg: Msg) {
  room.msgs[channel].push(msg);
  if (room.msgs[channel].length > 40) room.msgs[channel].shift();
  if (channel !== room.view) room.unread[channel] = true;
}

/** Everyone else whose voice you would hear. */
function company(room: Room): Peer[] {
  if (room.voice === null) return [];
  return room.peers.filter((p) => !p.you && p.channel === room.voice);
}

export type Strand = keyof typeof G.strand;

export function strandOf(room: Room): Strand {
  return company(room).length === 0 ? "idle" : "taut";
}

function isTalking(room: Room, name: string, now: number) {
  if (name === "alice" && (room.muted || room.voice === null)) return false;
  return (room.talking[name] ?? 0) > now;
}

/** 0–4, like the level the audio engine publishes. */
function level(room: Room, peer: Peer, now: number, still: boolean): number {
  if (!isTalking(room, peer.name, now)) return 0;
  if (still) return 3;
  const wave = Math.sin(now / 90 + peer.phase) + Math.sin(now / 37 + peer.phase * 2) * 0.6;
  return Math.max(1, Math.min(4, Math.round(2.4 + wave * 1.4)));
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
    while (line.length > width) {
      lines.push(line.slice(0, width));
      line = line.slice(width);
    }
  }
  lines.push(line);
  return lines;
}

function centre(text: string, width: number) {
  const pad = Math.max(0, Math.floor((width - [...text].length) / 2));
  return " ".repeat(pad) + text;
}

export type Frame = { now: number; still: boolean; focused: boolean; caretOn: boolean };

/**
 * The whole screen. Both sizes have the rail — channels, who is on the line,
 * audio — and the string down its edge; the narrow one, for phones, packs the
 * rail tighter and drops the clock from the talk so messages keep their room.
 */
export function draw(room: Room, frame: Frame, wide: boolean): Screen {
  const width = wide ? 76 : 50;
  const height = 20;
  const s = new Screen(width, height);
  const { now, still } = frame;
  const strand = strandOf(room);
  const listeners = company(room);
  const talkingNow = room.deaf
    ? []
    : [...listeners, ...room.peers.filter((p) => p.you)].filter((p) => isTalking(room, p.name, now));

  // Header: the name chip, where you are, and the link in one word.
  s.put(0, 0, " TINCAN ", "chip-patina", true);
  s.put(9, 0, "lobby", "tin", true);
  s.put(15, 0, `#${CHANNELS[room.view]}`, "patina", true);
  if (strand === "taut") {
    s.putRight(width - 6, 0, " DIRECT ", "chip-verdigris", true);
    s.putRight(width, 0, ` ${RTT_MS}ms `, "zinc");
  } else {
    s.putRight(width, 0, room.voice === null ? " TEXT " : " ALONE ", "chip-dim", true);
  }

  const railW = wide ? 24 : 17;
  const chatX = railW + 2;
  const chatW = width - chatX;
  const fit = (text: string, room4: number) =>
    [...text].length > room4 ? [...text].slice(0, room4 - 1).join("").trimEnd() + G.cut : text;

  s.panel(0, 1, railW, height - 2);
  s.put(1, 1, " CHANNELS ", "chip-tin", true);
  CHANNELS.forEach((name, i) => {
    const y = 2 + i;
    const viewing = i === room.view;
    if (viewing) s.put(2, y, G.cursor, "patina");
    if (room.voice === i) s.put(4, y, G.onAir, "patina");
    s.put(6, y, name, room.unread[i] ? "brass" : "tin", viewing);
    const count = room.peers.filter((p) => p.channel === i).length;
    if (count) s.putRight(railW - 2, y, String(count), "zinc");
  });

  s.put(1, 6, wide ? ` ON THE LINE · ${room.peers.length} ` : " ON THE LINE ", "chip-tin", true);
  room.peers.forEach((peer, i) => {
    const y = 7 + i;
    const lvl = level(room, peer, now, still);
    const heard = !room.deaf || peer.you;
    s.put(2, y, G.meter[lvl], lvl === 0 || !heard ? "zinc" : lvl === 4 ? "brass" : "patina");
    s.put(6, y, peer.name, "tin", lvl > 0);
    if (peer.you) s.put(7 + peer.name.length, y, "you", "zinc");
    // The narrow rail has no column for where people are, only for what you did.
    if (!wide && !(peer.you && (room.muted || room.deaf))) return;
    let where = peer.channel === null ? "—" : CHANNELS[peer.channel];
    let ink: Ink = "zinc";
    if (peer.you && room.deaf) [where, ink] = ["deafened", "alarm"];
    else if (peer.you && room.muted) [where, ink] = ["muted", "alarm"];
    if (!wide && peer.you) [where, ink] = [room.deaf ? "deaf" : "mute", "alarm"];
    s.putRight(railW - 1, y, where, ink);
  });

  s.put(1, 15, " AUDIO · F6 ", "chip-tin", true);
  s.put(2, 16, "mic", "zinc");
  s.put(7, 16, fit("MacBook Pro Microphone", railW - 8), room.muted ? "zinc" : "tin");
  s.put(2, 17, "out", "zinc");
  s.put(7, 17, fit("AirPods Pro", railW - 8), room.deaf ? "zinc" : "tin");

  // The string between the rail and the talk: it reports the link.
  const glyph = G.strand[strand];
  const strandInk: Ink = strand === "taut" ? "verdigris" : "dim";
  const rows = height - 2;
  const perRow = 55 + RTT_MS / 3;
  const pulse = talkingNow.length
    ? still
      ? Math.floor(rows / 2)
      : Math.floor(now / perRow) % rows
    : -1;
  for (let r = 0; r < rows; r++) {
    const whole = strand === "idle" ? r % 3 === 0 : true;
    if (r === pulse) s.put(railW + 1, r + 1, G.pulse, "patina", true);
    else if (whole) s.put(railW + 1, r + 1, glyph, strandInk);
  }

  // The talk: newest at the bottom, cans above while there is room for them.
  const inputY = height - 2;
  const msgs = room.msgs[room.view];
  const lines: { parts: [string, Ink, boolean][] }[] = [];
  const stamp = (at: string): [string, Ink, boolean] => [wide ? `${at}  ` : "", "zinc", false];
  const prefix = (wide ? 7 : 0) + 6;
  for (const m of msgs) {
    if (m.kind === "room") {
      for (const [i, text] of wrap(`${G.note} ${m.text}`, chatW - (wide ? 9 : 2)).entries()) {
        lines.push({ parts: [i === 0 ? stamp(m.at) : [wide ? "       " : "  ", "zinc", false], [text, "zinc", false]] });
      }
      continue;
    }
    if (m.kind === "code") {
      lines.push({ parts: [stamp(m.at), ["invite code", "zinc", false]] });
      for (const chunk of wrap(m.text.replaceAll("-", "- ").trim(), chatW - (wide ? 9 : 2))) {
        lines.push({ parts: [[wide ? "       " : "", "zinc", false], [chunk.replaceAll("- ", "-"), "brass", false]] });
      }
      continue;
    }
    const who = m.who.padEnd(6);
    const body = wrap(m.text, chatW - prefix - 1);
    body.forEach((text, i) =>
      lines.push({
        parts:
          i === 0
            ? [stamp(m.at), [who, m.who === "alice" ? "patina" : "tin", true], [text, "tin", false]]
            : [[" ".repeat(prefix), "zinc", false], [text, "tin", false]],
      })
    );
  }

  const chatTop = 1;
  const room4Cans = inputY - chatTop - lines.length >= 9;
  const visible = lines.slice(-(inputY - chatTop));
  visible.forEach((line, i) => {
    const y = inputY - visible.length + i;
    let x = chatX + 1;
    for (const [text, ink, bold] of line.parts) {
      s.put(x, y, text, ink, bold);
      x += [...text].length;
    }
  });

  if (room4Cans) drawCans(s, room, chatX, chatW, wide ? 4 : 3, strand, listeners);

  // The message field.
  s.panel(chatX, inputY, chatW, 1);
  const tag = `#${CHANNELS[room.view]} `;
  s.put(chatX + 1, inputY, tag, "patina");
  const fieldX = chatX + 1 + tag.length;
  const room4Text = chatW - tag.length - 3;
  const shown = room.input.length > room4Text ? room.input.slice(-room4Text) : room.input;
  // Only the wide terminal takes input; the narrow one just plays the scene.
  if (!shown && !frame.focused && wide) s.put(fieldX, inputY, "click here and type", "dim");
  s.put(fieldX, inputY, shown, "tin");
  if (frame.focused && (frame.caretOn || still)) s.put(fieldX + shown.length, inputY, G.caret, "patina");

  // Footer: shortcut hints, and the first group of the code.
  const hints = wide
    ? "tab channel · f2 talk · f3 mute · f5 deafen"
    : "f2 talk · f3 mute";
  s.put(1, height - 1, hints, "zinc");
  const code = INVITE.slice(0, 9) + G.cut;
  s.putRight(width - 1, height - 1, code, "brass");
  s.putRight(width - 2 - [...code].length, height - 1, "f1 code", "zinc");

  return s;
}

function drawCans(
  s: Screen,
  room: Room,
  x: number,
  w: number,
  y: number,
  strand: Strand,
  listeners: Peer[]
) {
  const can = G.can;
  const far = listeners[0]?.name ?? "";
  const span = Math.min(w - 4, 50);
  const gap = span - 14;
  const left = x + Math.floor((w - span) / 2);
  const right = left + 7 + gap;

  s.put(left, y, centre("you", 7), "zinc");
  s.put(left, y + 1, ` ${can.lid} `, "brass");
  s.put(left, y + 2, can.top, "tin");
  s.put(left, y + 3, can.body, "tin");
  s.put(left, y + 4, can.bottom, "tin");

  if (far) {
    s.put(right, y, centre(far, 7), "zinc");
    s.put(right, y + 1, ` ${can.lid} `, "brass");
    s.put(right, y + 2, can.top, "tin");
    s.put(right, y + 3, can.body, "tin");
    s.put(right, y + 4, can.bottom, "tin");
    const label = gap >= 15 ? `${RTT_MS}ms · direct` : `${RTT_MS}ms`;
    s.put(left + 7, y + 2, centre(label, gap), "dim");
    const half = Math.floor(gap / 2);
    const ink: Ink = strand === "taut" ? "verdigris" : "dim";
    s.put(left + 7, y + 3, can.string.repeat(half), ink);
    s.put(left + 7 + half, y + 3, can.knot, "brass");
    s.put(left + 8 + half, y + 3, can.string.repeat(gap - half - 1), ink);
  } else {
    // Nobody on the other end: the string hangs off your can, and the code to
    // hand out sits under it.
    const hang = Math.floor(gap / 2);
    s.put(left + 7, y + 3, can.string.repeat(hang), "dim");
    s.put(left + 7 + hang + 1, y + 3, room.voice === null ? "text only" : "waiting…", "dim");
    const lead = w >= 40 ? "send the code  " : "code ";
    s.put(left, y + 6, lead, "zinc");
    s.put(left + lead.length, y + 6, INVITE.slice(0, w >= 40 ? 14 : 9) + G.cut, "brass");
  }
}
