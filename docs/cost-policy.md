# Zero additional cloud budget

The user confirmed Workers Free on 2026-11-06. The additional monthly cloud budget for this project is **$0**. Do not upgrade plans, enable pay-as-you-go products, or add a billed subscription without explicit user approval. This does not describe existing domain renewal, home electricity or ISP costs.

Cloudflare enforces the account-wide Workers Free allowance: 100,000 Worker requests per UTC day and 10 ms CPU per HTTP invocation. The application does not impose a separate configurable global daily cap. Waiting for the origin is not CPU time. Since `run_worker_first` is enabled, requests for assets also invoke the Worker and consume that request allowance. Reaching the free request allowance can interrupt service; it does not automatically enable a paid plan.

The Free platform also caps subrequests at 50 per invocation. We attempted to lower this through Wrangler's `limits` field, but the deployment API rejected it with Free-plan error 100328. No plan upgrade was performed, and the existing live version remained active. Keep the native Free limits rather than adding paid-only configuration. There is no newly configured provider-side monthly or daily spending cap.

`npm run verify:cost` refuses custom runtime limits, additional service bindings or named deployment environments pending review. `npm run deploy` runs this guard and static-export checks before publishing. CI checks the same policy. Direct `wrangler deploy`, dashboard changes, account subscriptions and resources outside this repository are not controlled by the script. It cannot inspect invoices or enforce a provider-side spending cap.

Keep media backups and revisions on the existing homeserver/Git/static-assets path for the initial implementation. R2 is not enabled. D1, KV, Durable Objects, R2, paid monitoring, AI, queues and other bindings require a fresh quota/billing review even when they offer a free allowance. No new resource is created by this policy.

Workers Builds Free currently includes 3,000 build minutes/month. Avoid rebuilding on every draft save; batch published content changes. Usage should be checked in the Cloudflare dashboard, across all Workers on the account. The CLI session used here does not have Billing Read permission, so account subscription verification remains in the dashboard.

References:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
