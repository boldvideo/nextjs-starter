# Portal interaction rollout (BOLD-1967 / BOLD-1968)

## Release gate

Do not consider AI channel metadata rolled out with the current dependency.
The committed SDK is published `@boldvideo/bold-js` 1.29.0. It preserves interaction
IDs but drops `channel` and `clientName` options. The shared portal options are
ready for SDK 1.30.0; headers do not satisfy the backend's body/query contract.

1. Deploy the backend channel and explicit engagement contract.
2. Release SDK PR82 (https://github.com/boldvideo/bold-js/pull/82), then upgrade the
   starter's manifest and lock to the published 1.30.0 or newer.
3. Run `TEST_SDK_NEXT=1 bun run test:browser`. The metadata release-gate test must
   execute, not skip. Verify Ask, coach, video chat, and AI search upstream bodies.
4. Roll out the starter. This PR does not authorize releases or deployments.

Local SDK preview testing may replace only `node_modules/@boldvideo/bold-js` with
the SDK thread's tarball; never commit that tarball, an unavailable dependency,
or its lockfile. Restore the published dependency and rerun the ordinary suite.

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

## Checks

`bun run test`, `bun run lint`, `bunx tsc --noEmit`, and `bun run test:browser`
cover independent counters, pending/missing IDs, retry order, real proxy tenant
identity, paused typing, destination settlement, timestamps/new tabs, old-answer
clicks, and browser playback events. Browser media is deterministic rather than
real Mux playback. The local fixture proves caller/proxy contracts, not production
capture durability or backend enforcement.
