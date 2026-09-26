# Portal interaction rollout (BOLD-1967 / BOLD-1968)

## Published SDK and rollout

The manifest requires published `@boldvideo/bold-js` ^1.30.0 and the lockfile
resolves 1.30.0. This release forwards `channel` and `clientName` in AI request
bodies. SDK 1.29.0 preserved interaction IDs but dropped these options; headers
do not satisfy the backend's body/query contract.

The SDK publication blocker is resolved. Routine `bun run test:browser` and CI
now unconditionally verify Ask, coach, video chat, and AI search upstream bodies
and completion IDs. No preview tarball or environment flag is needed.

1. Ensure the backend channel and explicit engagement contract is deployed.
2. Install with `bun install --frozen-lockfile` and run the checks below.
3. Deploy this starter revision through the authorized rollout process. Merely
   publishing the SDK does not update an already-built portal.
4. After rollout, verify a fresh interaction reports `channel=portal` and
   `client_name=nextjs-starter`. Older captured rows are not backfilled by this
   upgrade. Local fixture tests do not prove the production deployment is current.

Keyword search already sends `channel=portal` and `client_name=nextjs-starter`.
The event proxy uses direct server fetch, so engagement does not depend on the
SDK release. AI uses the released SDK parser; there is no parallel SSE parser.

## Attribution and identity

- Each answer/results response owns its interaction ID. Older answers never
  adopt the newest answer's ID. Missing/null IDs produce no engagement.
- Preview-result links carry their original query and action UUID. The video
  destination issues the sole settled search, including timestamp/new-tab opens.
  Enter/See all still settle only on the results page.
- Each deliberate source open creates a new UUID (`playback_id`), unrelated to
  the Mux playback identifier. `source_open` is sent before progress. Progress is
  cumulative playing wall-clock seconds, not playhead/seek position. The backend
  max-deduplicates reordered/repeated counters.
- Mux pauses, buffering, seeking, completion, unmount, and pagehide stop the
  counter. Independent opens have independent counters. YouTube is **open-only**:
  its existing iframe exposes no playback lifecycle bridge.
- Pending answer opens retain their counter for up to 30 seconds. A short-lived
  localStorage handoff supports new tabs before completion; disabled storage,
  source-page termination, or missing completion can leave them unattributed.
- Early capture/open failures retry for at most 30 seconds with the same open
  UUID. Requests are best-effort with keepalive; IDs are not durable capture
  acknowledgements. Page termination can still drop requests.
- Tenant credentials come from server `getTenantContext`. This starter has no
  trusted Bold viewer mapping, so all AI and engagement remain anonymous and
  the event proxy strips browser `viewer`. Auth.js identities are not invented
  Bold viewer IDs. Backend scope/source validation remains authoritative.
- Hosted events retain the independent authenticated site lookup as well as the
  middleware authorization lookup. Removing that duplication is a deferred
  optimization, not grounds to trust a client-supplied tenant header or cache
  authorization settings. The event handler skips the additional SDK settings
  fetch. Successful progress sends retain the normal five-second cadence;
  failures and flushes queued during an upload can retry sooner.

## Checks

`bun run test`, `bun run lint`, `bunx tsc --noEmit`, and `bun run test:browser`
cover independent counters, pending/missing IDs, retry order, real proxy tenant
identity, paused typing, destination settlement, timestamps/new tabs, old-answer
clicks, portal metadata through real callers/proxies, and browser playback events.
Browser media is deterministic rather than real Mux playback. The local fixture
proves caller/proxy contracts, not production capture durability or backend
enforcement.
