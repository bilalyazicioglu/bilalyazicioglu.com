/**
 * The terminal's command set.
 *
 * Every command is a pure function: it reads the context it is given and
 * returns lines plus, at most, an *intent* — navigate, clear, close, copy,
 * convert an image, draw a banner. Nothing here touches the DOM, the router or
 * the clipboard; `Terminal.tsx` carries the intents out. That split keeps the
 * command set readable and lets it be exercised without a browser.
 *
 * `sudo` is the one exception: it picks its answer at random, which is the
 * whole joke. It only ever runs in the browser — the terminal is loaded with
 * `ssr: false` — so there is no server render for it to disagree with.
 */

import type { Project } from "@/lib/projects";
import type { ResolvedTheme, Theme } from "@/components/ThemeProvider";
import { siteConfig } from "@/site.config";

export type PostSummary = {
  slug: string;
  title: string;
  date: string;
};

export type LineTone = "default" | "muted" | "accent" | "error";

export type OutputLine = {
  text: string;
  tone?: LineTone;
  /** Rendered in a horizontally scrollable <pre> — used for ASCII art. */
  art?: boolean;
  /** Marks the lines of one piece of art, so it can be typed out in place. */
  block?: number;
};

export type CommandIntent =
  | { kind: "navigate"; href: string; external?: boolean }
  | { kind: "clear" }
  | { kind: "close" }
  | { kind: "copy" }
  | { kind: "pick-image"; cols?: number; invert?: boolean }
  | { kind: "banner"; text: string }
  /* Always a concrete choice: `theme toggle` is resolved by the command. */
  | { kind: "theme"; mode: Theme };

export type CommandResult = {
  lines: OutputLine[];
  intent?: CommandIntent;
};

export type CommandContext = {
  posts: PostSummary[];
  postsLoading: boolean;
  projects: Project[];
  theme: Theme;
  resolvedTheme: ResolvedTheme;
};

type Command = {
  name: string;
  summary: string;
  usage?: string;
  run: (args: string[], ctx: CommandContext) => CommandResult;
};

const PAGES = [
  { name: "home", href: "/", about: "Landing page" },
  { name: "about", href: "/about", about: "Who I am, CV, experience" },
  { name: "projects", href: "/projects", about: "Everything I have shipped" },
  { name: "blog", href: "/blog", about: "Writing" },
];

const line = (text: string, tone?: LineTone): OutputLine => ({ text, tone });
const blank = (): OutputLine => ({ text: "" });

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

const help: Command = {
  name: "help",
  summary: "Show this list",
  run: () => ({
    lines: [
      line("Available commands", "accent"),
      ...REGISTRY.map((cmd) => line(`  ${pad(cmd.usage ?? cmd.name, 30)}${cmd.summary}`)),
      blank(),
      line("Up/Down for history · Tab to complete · Esc to close", "muted"),
    ],
  }),
};

const ls: Command = {
  name: "ls",
  summary: "List pages, projects or posts",
  usage: "ls [projects|blog]",
  run: (args, ctx) => {
    const target = (args[0] ?? "").toLowerCase();

    if (target === "projects") {
      return {
        lines: ctx.projects.map((project) =>
          line(
            `  ${pad(project.slug, 20)}${project.category === "Private" ? "private" : "open source"}`
          )
        ),
      };
    }

    if (target === "blog" || target === "posts") {
      if (ctx.postsLoading) return { lines: [line("  loading posts…", "muted")] };
      if (ctx.posts.length === 0) return { lines: [line("  no posts", "muted")] };
      return {
        lines: ctx.posts.map((post) =>
          line(`  ${pad(post.date.slice(0, 10), 12)}${post.slug}`)
        ),
      };
    }

    if (target) {
      return { lines: [line(`ls: ${target}: no such directory`, "error")] };
    }

    return {
      lines: [
        ...PAGES.map((page) => line(`  ${pad(page.name, 12)}${page.about}`)),
        blank(),
        line("  try 'ls projects' or 'ls blog'", "muted"),
      ],
    };
  },
};

const open: Command = {
  name: "open",
  summary: "Open a page, post or project",
  usage: "open <page|slug>",
  run: (args, ctx) => {
    const target = (args[0] ?? "").toLowerCase().replace(/^\/+/, "");
    if (!target) {
      return { lines: [line("open: open what? try 'ls'", "error")] };
    }

    const page = PAGES.find((candidate) => candidate.name === target);
    if (page) {
      return {
        lines: [line(`opening ${page.href}…`, "muted")],
        intent: { kind: "navigate", href: page.href },
      };
    }

    const post = ctx.posts.find((candidate) => candidate.slug === target);
    if (post) {
      return {
        lines: [line(`opening ${post.title}…`, "muted")],
        intent: { kind: "navigate", href: `/blog/${post.slug}` },
      };
    }

    const project = ctx.projects.find((candidate) => candidate.slug === target);
    if (project) {
      if (!project.href) {
        return {
          lines: [line(`${project.name} is private — no public repository`, "muted")],
        };
      }
      return {
        lines: [line(`opening ${project.href}…`, "muted")],
        // tincan has its own page on this site; everything else is a repository.
        intent: { kind: "navigate", href: project.href, external: /^https?:\/\//.test(project.href) },
      };
    }

    return { lines: [line(`open: ${target}: not found`, "error")] };
  },
};

const cat: Command = {
  name: "cat",
  summary: "Print about, cv or contact",
  usage: "cat <about|cv|contact>",
  run: (args) => {
    const target = (args[0] ?? "").toLowerCase();

    if (target === "about") return { lines: [line(siteConfig.bio)] };

    if (target === "cv" || target === "resume") {
      return {
        lines: [line(`fetching ${siteConfig.resumeUrl}…`, "muted")],
        intent: { kind: "navigate", href: siteConfig.resumeUrl, external: true },
      };
    }

    if (target === "contact") {
      return {
        lines: [
          line(`email     ${siteConfig.email}`),
          ...siteConfig.socials.map((social) =>
            line(`${pad(social.label.toLowerCase(), 10)}${social.href}`)
          ),
        ],
      };
    }

    return { lines: [line("cat: about, cv or contact", "error")] };
  },
};

const whoami: Command = {
  name: "whoami",
  summary: "One line about me",
  run: () => ({
    lines: [
      line(`${siteConfig.name} — ${siteConfig.role}`),
      line(`${siteConfig.location} · ${siteConfig.availability}`, "muted"),
    ],
  }),
};

const LOGO = [
  "  ██████╗ ",
  "  ██╔══██╗",
  "  ██████╔╝",
  "  ██╔══██╗",
  "  ██████╔╝",
  "  ╚═════╝ ",
];

const neofetch: Command = {
  name: "neofetch",
  summary: "Site fact sheet",
  run: (_args, ctx) => {
    const facts = [
      `${siteConfig.name.toLowerCase().replace(/\s+/g, "")}@web`,
      "-".repeat(22),
      `role     ${siteConfig.role}`,
      `location ${siteConfig.location}`,
      "stack    Next.js 16 · TypeScript · Tailwind 4",
      `projects ${ctx.projects.length}`,
      `posts    ${ctx.postsLoading ? "…" : ctx.posts.length}`,
      `host     ${siteConfig.url.replace(/^https?:\/\//, "")}`,
    ];

    const rows = Math.max(LOGO.length, facts.length);
    const lines: OutputLine[] = [];
    for (let i = 0; i < rows; i++) {
      lines.push({ text: `${pad(LOGO[i] ?? "", 12)}${facts[i] ?? ""}`, art: true });
    }
    return { lines };
  },
};

const ascii: Command = {
  name: "ascii",
  summary: "Turn an image into ASCII art",
  usage: "ascii [--width 100] [--invert]",
  run: (args) => {
    let cols: number | undefined;
    let invert = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--invert" || arg === "-i") {
        invert = true;
        continue;
      }
      if (arg === "--width" || arg === "-w") {
        cols = Number(args[i + 1]);
        if (!cols || Number.isNaN(cols)) {
          return { lines: [line("ascii: --width wants a number, e.g. --width 120", "error")] };
        }
        i++;
        continue;
      }
      return { lines: [line(`ascii: unknown option ${arg}`, "error")] };
    }

    return {
      lines: [line("pick an image — or drop one anywhere on this window", "muted")],
      intent: { kind: "pick-image", cols, invert },
    };
  },
};

const banner: Command = {
  name: "banner",
  summary: "Draw text in the site's pixel face",
  usage: "banner <text>",
  run: (args) => {
    const text = args.join(" ");
    if (!text) {
      return {
        lines: [line("banner: give me some text, e.g. banner hello", "error")],
      };
    }
    return { lines: [], intent: { kind: "banner", text } };
  },
};

const theme: Command = {
  name: "theme",
  summary: "Switch between light and dark",
  usage: "theme [dark|light|system]",
  run: (args, ctx) => {
    const target = (args[0] ?? "").toLowerCase();

    if (!target || target === "status") {
      const suffix = ctx.theme === "system" ? ` (system says ${ctx.resolvedTheme})` : "";
      return {
        lines: [
          line(`theme: ${ctx.theme}${suffix}`),
          line("  theme dark · theme light · theme system · theme toggle", "muted"),
        ],
      };
    }

    // `toggle` is answered against what is on screen, not what was chosen, so
    // it always flips the palette the visitor is actually looking at.
    const mode: Theme | null =
      target === "dark" || target === "light" || target === "system"
        ? target
        : target === "toggle"
          ? ctx.resolvedTheme === "dark"
            ? "light"
            : "dark"
          : null;

    if (!mode) {
      return { lines: [line(`theme: ${target}: try dark, light, system or toggle`, "error")] };
    }

    return {
      lines: [line(`theme set to ${mode}`, "muted")],
      intent: { kind: "theme", mode },
    };
  },
};

const copy: Command = {
  name: "copy",
  summary: "Copy the last output to the clipboard",
  run: () => ({ lines: [], intent: { kind: "copy" } }),
};

const clear: Command = {
  name: "clear",
  summary: "Clear the screen",
  run: () => ({ lines: [], intent: { kind: "clear" } }),
};

const exit: Command = {
  name: "exit",
  summary: "Close the terminal",
  run: () => ({ lines: [], intent: { kind: "close" } }),
};

/**
 * Not hand-drawn: this is the site's own `ascii` engine output for a picture of
 * the gesture, at the same 46 columns anyone would get by running it. The
 * speckle is the converter's, and it stays — it is the house style, and the
 * shape reads through it.
 */
const FINGER = [
  ".  .  .  .  .  .  .   B$$a .  .  .  .  .  .  .",
  "                     B   B",
  "  .  .  .  .  .  .  .B   B   .  .  .  .  .  .",
  ".  .  .  .  .  .  .  B   B .  .  .  .  .  .  .",
  ".  .  .  .  .  .  .  B   B .  .  .  .  .  .  .",
  "  .  .  .  .  .   BBBB   B   .  .  .  .  .  .",
  ".  .  .  .  .  .L&   $   B*  &BB .  .  .  .  .",
  ".  .  .  .     .LB   $   B*  B~ B*  .  .  .  .",
  "  .  .  .  %0  BBB       B*  B~  *B.  .  .  .",
  ".  .  .  . @%   kB               *B .  .  .  .",
  ".  .  .  .  &&B kB               *B .  .  .  .",
  "  .  .  .  .  8                  *B.  .  .  .",
  ".  .  .  .  .  B$               @$$ .  .  .  .",
  ".  .  .  .  .  . B              %*  .  .  .  .",
  "  .  .  .  .  .  B            LBB* .  .  .  .",
  ".  .  .  .  .  .  B           CB .  .  .  .  .",
  ".  .  .  .  .  .  BBBBBBBBBBBB%B .  .  .  .  .",
];

/** Five answers, one picked per attempt. Four of them are only words. */
const SUDO_REPLIES: ((target: string) => OutputLine[])[] = [
  (target) => [
    line(`sudo: ${target}: this whole thing runs in your browser — nobody is root here`, "muted"),
  ],
  () => [
    line("sudo: bilal is not in the sudoers file. this incident will be reported.", "muted"),
    line("reported to nobody, from your own laptop, at your own expense.", "muted"),
  ],
  () => [
    line("sudo: password: ●●●●●●●●", "muted"),
    line("wrong. there was never a password.", "muted"),
  ],
  (target) => [
    line(`sudo: ${target}: nothing here to administer — it is a CV, not a cluster`, "muted"),
  ],
  () => FINGER.map((art) => ({ text: art, art: true }) as OutputLine),
];

const sudo: Command = {
  name: "sudo",
  summary: "Worth a try",
  run: (args) => {
    const target = args.join(" ") || "that";
    const reply = SUDO_REPLIES[Math.floor(Math.random() * SUDO_REPLIES.length)];
    return { lines: reply(target) };
  },
};

const REGISTRY: Command[] = [
  help,
  ls,
  open,
  cat,
  whoami,
  neofetch,
  ascii,
  banner,
  theme,
  copy,
  clear,
  exit,
  sudo,
];

export const COMMAND_NAMES = REGISTRY.map((command) => command.name);

/** Command names first, then the arguments that command accepts. */
export function complete(input: string, ctx: CommandContext): string[] {
  const parts = input.split(/\s+/);
  if (parts.length <= 1) {
    return COMMAND_NAMES.filter((name) => name.startsWith(parts[0] ?? ""));
  }

  const [name, ...rest] = parts;
  const prefix = rest[rest.length - 1] ?? "";
  let candidates: string[] = [];

  if (name === "ls") candidates = ["projects", "blog"];
  if (name === "cat") candidates = ["about", "cv", "contact"];
  if (name === "ascii") candidates = ["--width", "--invert"];
  if (name === "theme") candidates = ["dark", "light", "system", "toggle"];
  if (name === "open") {
    candidates = [
      ...PAGES.map((page) => page.name),
      ...ctx.posts.map((post) => post.slug),
      ...ctx.projects.map((project) => project.slug),
    ];
  }

  return candidates
    .filter((candidate) => candidate.startsWith(prefix))
    .map((candidate) => [name, ...rest.slice(0, -1), candidate].join(" "));
}

export function runCommand(input: string, ctx: CommandContext): CommandResult {
  const [name, ...args] = input.trim().split(/\s+/);
  if (!name) return { lines: [] };

  const command = REGISTRY.find((candidate) => candidate.name === name.toLowerCase());
  if (!command) {
    return { lines: [line(`command not found: ${name} — try 'help'`, "error")] };
  }

  return command.run(args, ctx);
}

export function welcomeLines(): OutputLine[] {
  return [
    line("Last login: welcome to a terminal that lives in a web page.", "muted"),
    line("Type 'help', or drop an image here to turn it into ASCII art.", "muted"),
    blank(),
  ];
}
