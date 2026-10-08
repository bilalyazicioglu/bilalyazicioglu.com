/**
 * The ways to install tincan, in the order they are offered. Shared by the
 * install tabs on tincan.rs and the plain-text page `curl tincan.rs` gets.
 */
export const TINCAN_INSTALL = [
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
