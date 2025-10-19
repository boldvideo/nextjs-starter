# ADR-0001: Anonymous Video Progress Storage

**Date**: 2025-10-19
**Status**: Accepted
**Deciders**: Marcel Fahle
**Related Tickets**: BOLD-728, BOLD-729

## Context

The Bold video portal needs YouTube-style video progress tracking (progress bars on thumbnails, resume functionality) without requiring user authentication. The portal serves multiple tenants, and video IDs use hashids (not UUIDs yet), making tenant identification critical for uniqueness.

### Requirements:
- Progress bars on video thumbnails showing % watched
- Automatic resume when returning to partially-watched videos
- No authentication required (anonymous users)
- Cross-tab synchronization (changes visible across browser tabs)
- Forward-compatible with future server-side sync
- Works in offline/incognito with graceful degradation
- Multi-tenant support (tenant slug is critical for uniqueness)

### Constraints:
- Next.js 14 with SSR requires hydration-safe patterns
- Video IDs are hashids (same IDs across tenants until UUID migration)
- Tenant identification via `settings.account.slug` endpoint
- Client-side only for v1 (no server persistence)

## Decision

We will use **IndexedDB** for client-side progress storage with the following schema:

### Storage Schema (ProgressV1)

```typescript
interface ProgressRecord {
  // Composite key
  id: string;                    // Format: "bt_${slug}:${videoId}"

  // Progress data
  videoId: string;               // Video hashid
  tenantId: string;              // Format: "bt_${slug}" (e.g., "bt_ranger")
  position: number;              // Last playback position in seconds
  duration: number;              // Total video duration in seconds
  percentWatched: number;        // Calculated: (position / duration) * 100
  completed: boolean;            // True if percentWatched >= 90
  lastWatched: string;           // ISO 8601 timestamp
  version: number;               // Schema version (always 1 for v1)
}
```

### Key Design Decisions:

1. **Database Name**: `bold-video-progress`
2. **Object Store**: `progress` with keyPath `id`
3. **Composite Key Format**: `bt_${slug}:${videoId}`
   - Example: `bt_ranger:abc123` for video "abc123" on "ranger" tenant
   - Prefix "bt_" (Bold Tenant) for internal consistency
   - Ensures uniqueness across tenants (critical until UUID migration)
4. **Completion Threshold**: 90% watched (YouTube-style)
5. **Write Throttling**: Save every 2-3 seconds + on pause/seeking/ended events
6. **Opt-Out Mechanism**: Deferred (tracked for a future iteration; initial launch stores progress unconditionally)
7. **Library**: `idb` (Jake Archibald's promise wrapper, 1.5KB)

### Tenant ID Resolution:

```typescript
// Get from settings endpoint
const { data: settings } = await bold.settings();
const tenantId = `bt_${settings.account.slug}`;
// Example: slug="ranger" → tenantId="bt_ranger"
```

### Cross-Tab Synchronization:

**Primary Method**: BroadcastChannel API
```typescript
const channel = new BroadcastChannel('bold-progress');
channel.postMessage({ type: 'progress-update', videoId, tenantId });
```

**Fallback**: Storage events (for browsers without BroadcastChannel)
```typescript
localStorage.setItem('bold-progress-sync', Date.now().toString());
window.addEventListener('storage', handleStorageChange);
```

## Alternatives Considered

### Alternative 1: localStorage
**Pros**: Simple, synchronous API, no library needed
**Cons**:
- Size limit (~5-10MB, problematic for many videos)
- Synchronous/blocking writes (performance impact)
- No structured queries (must parse all data)
- Hard to evolve schema (breaking changes on structure updates)

**Rejected**: Not scalable for growing video catalogs

### Alternative 2: Cookies
**Pros**: Works across subdomains, simple API
**Cons**:
- Tiny size limit (4KB, stores ~10 videos max)
- Sent with every HTTP request (performance overhead)
- Security concerns (XSS if not HttpOnly)

**Rejected**: Too limited for typical use

### Alternative 3: Server-Only Storage
**Pros**: Sync across devices, persistent, reliable
**Cons**:
- Requires authentication (defeats "anonymous" requirement)
- Adds server complexity and storage costs
- Network dependency (slow, fails offline)

**Deferred**: Planned for v2 when authentication exists

### Alternative 4: sessionStorage
**Pros**: Simple API, isolated per-tab
**Cons**:
- Lost on tab close (poor UX)
- No cross-tab sync

**Rejected**: Doesn't meet persistence requirement

## Consequences

### Positive:

1. **Tiny Client Footprint**: IndexedDB is async/non-blocking
2. **Scalable**: Can store thousands of video progress records
3. **Fast Reads**: Indexed by composite key for O(1) lookups
4. **Future-Proof**: Easy to add server sync later (keep IndexedDB as cache)
5. **Schema Evolution**: `version` field enables migrations
6. **Privacy-Friendly**: Data stays on device, user can clear
7. **Offline Support**: Works without network
8. **Multi-Tenant Safe**: Composite key prevents collisions

### Negative:

1. **Browser-Specific**: Progress doesn't sync across devices (acceptable for v1)
2. **Incognito Limitation**: Data lost on session end (graceful degradation)
3. **Storage Quota**: Subject to browser limits (~50MB-1GB, plenty for videos)
4. **Complexity**: More code than localStorage (mitigated by `idb` library)
5. **Edge Case**: Tenant slug changes require migration (rare, acceptable)

### Trade-offs:

- **Auto-Resume vs Prompt**: V1 auto-seeks to saved position (simpler UX, less control)
  - Future: Add resume prompt with countdown and "Start Over" button
- **Single Position vs Ranges**: V1 stores last position only (simpler schema)
  - Future: Add `ranges: { start: number, end: number }[]` for accuracy
- **90% Threshold**: Balances UX (users skip credits) with accuracy
  - Configurable in future if needed

## Implementation Notes

### Error Handling Strategy:

```typescript
// Graceful degradation
try {
  await saveProgress(videoId, position);
} catch (error) {
  console.warn('Progress save failed:', error);
  // Feature degrades silently - video still plays
}
```

### Hydration Safety Pattern:

```typescript
// Follow playlist-provider pattern
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
  // Only access IndexedDB after mount
  loadProgress();
}, []);
```

### Migration Path (Future):

When adding server sync:
1. Keep IndexedDB as local cache
2. Add server write-through on progress save
3. Fetch from server on first load
4. Merge local + server progress (take latest `lastWatched`)

### Testing Considerations:

- **Unit Tests**: Mock IndexedDB with `fake-indexeddb`
- **Integration Tests**: Test cross-tab sync with multiple browser contexts
- **Manual Tests**: Verify incognito mode graceful degradation
- **Edge Cases**: Test storage quota exceeded, corrupt data, schema migrations

## References

- **Original Ticket**: `thoughts/shared/research/2025-10-19-BOLD-728-anonymous-video-progress.md`
- **BOLD-728**: Frontend implementation of anonymous video progress (v1)
- **BOLD-729**: Write ADR documenting the architectural decision
- **IndexedDB Spec**: https://w3c.github.io/IndexedDB/
- **BroadcastChannel API**: https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
- **idb Library**: https://github.com/jakearchibald/idb
