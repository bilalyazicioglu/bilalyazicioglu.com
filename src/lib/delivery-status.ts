export type DeliveryStatus = {
  backend: "homeserver" | "static-fallback";
  release: { sha: string | null; builtAt: string | null; activatedAt: string | null };
  checkedAt: string;
};
