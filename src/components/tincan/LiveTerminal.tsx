"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHANNELS, INVITE, clock, draw, newRoom, say, type Room, type Run } from "./sim";

/**
 * The room on the page: plays a short scene on its own (bob picks up, talks,
 * says hello, you answer), and on a wide screen it is yours from the first key
 * you press — the same shortcuts as the app, with bob answering back. On a
 * narrow screen it only plays, and plays the scene again when it ends.
 */

/** How long the finished scene holds before a narrow terminal starts it over. */
const REPLAY_AFTER_MS = 7000;

const REPLIES = [
  "loud and clear.",
  "the string went taut on my end too",
  "18ms from here. not bad for no server",
  "try f3, i'll tell you if you drop out",
  "cem's in #gaming if you want to tab over",
  "tell me you didn't need a vpn for this",
];

/** `yours` beats act as you, so they stop once you have the keyboard. */
type Beat = { at: number; yours?: boolean; run: (room: Room, now: number) => void };

const AUTOPILOT = "loud and clear! tincan is fast";

const BEATS: Beat[] = [
  {
    at: 1600,
    run: (room) => {
      room.joined = true;
      room.peers.push({ name: "bob", you: false, channel: 0, phase: 1.7 });
      say(room, 0, { at: clock(), who: "", text: "bob picked up", kind: "room" });
    },
  },
  { at: 2300, run: (room, now) => void (room.talking.bob = now + 2900) },
  {
    at: 5500,
    run: (room) => say(room, 0, { at: clock(), who: "bob", text: "hey, can you hear me alright?", kind: "chat" }),
  },
  ...[...AUTOPILOT].map((_, i) => ({
    at: 6400 + i * 70,
    yours: true,
    run: (room: Room) => void (room.input = AUTOPILOT.slice(0, i + 1)),
  })),
  { at: 6200, yours: true, run: (room, now) => void (room.talking.alice = now + 1500) },
  {
    at: 9200,
    yours: true,
    run: (room) => {
      say(room, room.view, { at: clock(), who: "alice", text: room.input, kind: "chat" });
      room.input = "";
    },
  },
  {
    at: 9800,
    run: (room) => {
      room.peers.push({ name: "cem", you: false, channel: 1, phase: 3.1 });
      say(room, 1, { at: clock(), who: "", text: "cem picked up", kind: "room" });
    },
  },
  { at: 10600, run: (room, now) => void (room.talking.bob = now + 2200) },
  {
    at: 12900,
    run: (room) => say(room, 0, { at: clock(), who: "bob", text: "no server, no account. love it", kind: "chat" }),
  },
  {
    at: 14500,
    run: (room) => say(room, 1, { at: clock(), who: "cem", text: "anyone up for a round?", kind: "chat" }),
  },
];

// The clock walks the scene in order, so keep it sorted however it was written.
const SCENE = [...BEATS].sort((a, b) => a.at - b.at);

type Shot = { runs: Run[][]; view: number };

// What the server renders and the first paint shows: the room before anyone
// has picked up. Deterministic, so hydration has nothing to disagree about.
const OPENING: Shot = {
  runs: draw(newRoom(), { now: 0, still: false, focused: false, caretOn: true }, true).runs(),
  view: 0,
};

export function LiveTerminal() {
  const hostRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const roomRef = useRef<Room>(newRoom());
  const startRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const scriptedRef = useRef(true);
  const replyRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  // How the grid is drawn, read by the clock and the handlers rather than render.
  const lookRef = useRef({ wide: true, focused: false, still: false, caretOn: true });

  const [shot, setShot] = useState<Shot>(OPENING);
  const [wide, setWide] = useState(true);
  const [fontSize, setFontSize] = useState(13);
  const [focused, setFocused] = useState(false);
  const [still, setStill] = useState(false);
  const [announce, setAnnounce] = useState("");

  const roomNow = useCallback(
    () => (startRef.current === null ? 0 : performance.now() - startRef.current),
    []
  );
  const redraw = useCallback(() => {
    const look = lookRef.current;
    const room = roomRef.current;
    const screen = draw(
      room,
      { now: roomNow(), still: look.still, focused: look.focused, caretOn: look.caretOn },
      look.wide
    );
    setShot({ runs: screen.runs(), view: room.view });
  }, [roomNow]);

  // Fit the grid to its box: pick the layout by width, then size the type so
  // the grid spans the box exactly.
  useEffect(() => {
    const host = hostRef.current;
    const probe = probeRef.current;
    if (!host || !probe) return;
    let ratio = 0.6;
    const measure = () => {
      const w = probe.getBoundingClientRect().width;
      if (w > 0) ratio = w / 1000;
    };
    const fit = () => {
      const style = getComputedStyle(host);
      const width =
        host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 1;
      const isWide = width >= 560;
      lookRef.current.wide = isWide;
      setWide(isWide);
      redraw();
      setFontSize(Math.min(15, width / ((isWide ? 76 : 50) * ratio)));
    };
    measure();
    fit();
    document.fonts?.ready.then(() => {
      measure();
      fit();
    });
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      lookRef.current.still = query.matches;
      setStill(query.matches);
      redraw();
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [redraw]);

  // The clock only runs while the terminal is on screen and the tab is visible.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let frame = 0;
    let visible = false;
    let last = 0;
    let pausedAt: number | null = null;

    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      if (t - last < 50) return;
      last = t;
      if (startRef.current === null) startRef.current = t;
      const now = t - startRef.current;
      const room = roomRef.current;
      while (beatRef.current < SCENE.length && SCENE[beatRef.current].at <= now) {
        const beat = SCENE[beatRef.current++];
        if (scriptedRef.current || !beat.yours) beat.run(room, now);
      }
      const ended = beatRef.current >= SCENE.length;
      if (ended && !lookRef.current.wide && scriptedRef.current && now > SCENE[SCENE.length - 1].at + REPLAY_AFTER_MS) {
        roomRef.current = newRoom();
        beatRef.current = 0;
        startRef.current = t;
      } else if (ended) {
        // After the scene, bob and cem keep talking now and then.
        for (const peer of room.peers) {
          if (peer.you) continue;
          const until = room.talking[peer.name] ?? 0;
          if (until < now - 4000 && Math.random() < 0.004) room.talking[peer.name] = now + 1400 + Math.random() * 2200;
        }
      }
      redraw();
    };

    const start = () => {
      if (frame) return;
      if (pausedAt !== null && startRef.current !== null) {
        startRef.current += performance.now() - pausedAt;
        pausedAt = null;
      }
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
      pausedAt = performance.now();
    };
    const decide = () => (visible && !document.hidden ? start() : stop());

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      decide();
    });
    observer.observe(host);
    document.addEventListener("visibilitychange", decide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", decide);
      cancelAnimationFrame(frame);
    };
  }, [redraw]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const takeOver = () => {
    if (!scriptedRef.current) return;
    scriptedRef.current = false;
    const room = roomRef.current;
    if (room.input && !room.msgs[room.view].some((m) => m.text === room.input)) room.input = "";
  };

  const act = useCallback(
    (action: "tab" | "backtab" | "talk" | "mute" | "deafen" | "code") => {
      takeOver();
      const room = roomRef.current;
      const note = (text: string) => {
        say(room, room.view, { at: clock(), who: "", text, kind: "room" });
        setAnnounce(text);
      };
      switch (action) {
        case "tab":
        case "backtab": {
          room.view = (room.view + (action === "tab" ? 1 : CHANNELS.length - 1)) % CHANNELS.length;
          room.unread[room.view] = false;
          setAnnounce(`viewing #${CHANNELS[room.view]}`);
          break;
        }
        case "talk": {
          const me = room.peers[0];
          if (room.voice === room.view) {
            room.voice = null;
            me.channel = null;
            note(`you left the voice of #${CHANNELS[room.view]}`);
          } else {
            room.voice = room.view;
            me.channel = room.view;
            note(`you're talking in #${CHANNELS[room.view]}`);
          }
          break;
        }
        case "mute":
          room.muted = !room.muted;
          note(room.muted ? "microphone off" : "microphone on");
          break;
        case "deafen":
          room.deaf = !room.deaf;
          if (room.deaf) room.muted = true;
          note(room.deaf ? "deafened: you hear nobody, and your mic is closed" : "you can hear the room again");
          if (!room.deaf) room.muted = false;
          break;
        case "code":
          say(room, room.view, { at: clock(), who: "", text: INVITE, kind: "code" });
          setAnnounce("invite code printed in the chat");
          break;
      }
      redraw();
    },
    [redraw]
  );

  const send = () => {
    const room = roomRef.current;
    const text = room.input.trim();
    if (!text) return;
    room.input = "";
    const channel = room.view;
    say(room, channel, { at: clock(), who: "alice", text, kind: "chat" });
    const answerer = room.peers.find((p) => !p.you && p.channel === channel);
    if (answerer) {
      const reply = REPLIES[replyRef.current++ % REPLIES.length];
      timersRef.current.push(
        window.setTimeout(() => {
          roomRef.current.talking[answerer.name] = roomNow() + 1200;
          say(roomRef.current, channel, { at: clock(), who: answerer.name, text: reply, kind: "chat" });
          setAnnounce(`${answerer.name}: ${reply}`);
          redraw();
        }, 1100 + Math.random() * 900)
      );
    }
    redraw();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const room = roomRef.current;
    const key = e.key;
    const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
    let handled = true;
    if (key === "Escape") {
      hostRef.current?.blur();
    } else if (key === "Tab") {
      act(e.shiftKey ? "backtab" : "tab");
    } else if (key === "F2" || (ctrl && key.toLowerCase() === "g")) {
      act("talk");
    } else if (key === "F3") {
      act("mute");
    } else if (key === "F5") {
      act("deafen");
    } else if (key === "F1") {
      act("code");
    } else if (key === "Enter") {
      takeOver();
      send();
    } else if (key === "Backspace") {
      takeOver();
      room.input = room.input.slice(0, -1);
      redraw();
    } else if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      takeOver();
      if (room.input.length < 120) room.input += key;
      redraw();
    } else {
      handled = false;
    }
    if (handled) e.preventDefault();
  };

  // A blinking caret, the way a terminal has one.
  useEffect(() => {
    if (!focused || still) return;
    const id = window.setInterval(() => {
      lookRef.current.caretOn = !lookRef.current.caretOn;
      redraw();
    }, 530);
    return () => clearInterval(id);
  }, [focused, still, redraw]);

  const setFocus = (on: boolean) => {
    lookRef.current.focused = on;
    lookRef.current.caretOn = true;
    setFocused(on);
    redraw();
  };

  return (
    <div className="tc-term-wrap">
      <div className="tc-window">
        <div className="tc-window-bar" aria-hidden="true">
          <span className="tc-lights">
            <i />
            <i />
            <i />
          </span>
          <span>tincan — lobby (#{CHANNELS[shot.view]})</span>
        </div>
        <div
          ref={hostRef}
          className={`tc-screen${wide ? "" : " tc-screen--still"}`}
          {...(wide
            ? {
                tabIndex: 0,
                role: "application",
                "aria-label":
                  "A working imitation of the tincan interface. Type to chat; Tab changes channel, F2 joins or leaves voice, F3 mutes, F5 deafens, F1 prints the invite code, Escape lets go of the keyboard.",
                "aria-describedby": "tc-term-help",
                onKeyDown,
                onFocus: () => setFocus(true),
                onBlur: () => setFocus(false),
              }
            : {
                role: "img",
                "aria-label":
                  "The tincan interface playing a short scene: bob joins the room, talks, and the two of them trade messages.",
              })}
          style={{ fontSize }}
        >
          <span ref={probeRef} className="tc-probe" aria-hidden="true">
            {"0".repeat(10)}
          </span>
          <pre aria-hidden="true">
            {shot.runs.map((row, y) => (
              <span key={y} className="tc-row">
                {row.map((run, i) => (
                  <span
                    key={i}
                    className={`i-${run.ink}${run.bold ? " b" : ""}${run.panel && !run.ink.startsWith("chip") ? " p" : ""}`}
                  >
                    {run.text}
                  </span>
                ))}
                {"\n"}
              </span>
            ))}
          </pre>
          <p className="tc-sr" aria-live="polite">
            {announce}
          </p>
        </div>
      </div>
      {wide && (
      <div className="tc-keys" id="tc-term-help">
        <span className="tc-keys-lead">Click the terminal and type, or press</span>
        <button type="button" onClick={() => act("tab")}>
          <kbd>Tab</kbd> channel
        </button>
        <button type="button" onClick={() => act("talk")}>
          <kbd>F2</kbd> talk
        </button>
        <button type="button" onClick={() => act("mute")}>
          <kbd>F3</kbd> mute
        </button>
        <button type="button" onClick={() => act("deafen")}>
          <kbd>F5</kbd> deafen
        </button>
        <button type="button" onClick={() => act("code")}>
          <kbd>F1</kbd> code
        </button>
        <span className="tc-keys-lead">
          <kbd>Esc</kbd> gives the keyboard back.
        </span>
      </div>
      )}
    </div>
  );
}
