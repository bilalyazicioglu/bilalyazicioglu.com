import assert from "node:assert/strict";
import fs from "node:fs";

// This is a deployment guard, not an account-level spending cap.
const config = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
assert(!("limits" in config),
  "Custom runtime limits were rejected on Free. Keep the platform's native Free limits; do not upgrade to configure them.");
const reviewRequired = [
  "r2_buckets", "d1_databases", "durable_objects", "kv_namespaces", "queues",
  "services", "analytics_engine_datasets", "ai", "vectorize", "hyperdrive",
  "workflows", "containers", "dispatch_namespaces", "unsafe", "send_email",
  "pipelines", "browser", "secrets_store_secrets", "ratelimits",
];
for (const key of reviewRequired) {
  assert(!(key in config), `${key} requires an explicit free-tier/cost review before deployment.`);
}
assert(!config.env || Object.keys(config.env).length === 0,
  "Named environments require the same cost review; do not bypass the root configuration guard.");
console.log("Cost policy passed: native Free limits; no additional service bindings or paid-only runtime configuration. Additional cloud budget: $0.");
