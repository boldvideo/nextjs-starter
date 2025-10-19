---
date: 2025-10-19T04:08:46+0000
researcher: Marcel Fahle
git_commit: e35f4abaf4658ba79df5c65f04e90f33baf2de10
branch: main
repository: bold-nextjs-tailwind-starter
topic: "Anonymous Video Progress Tracking (BOLD-728, BOLD-729)"
tags: [research, codebase, mux-player, storage, indexeddb, adr, progress-tracking]
status: complete
last_updated: 2025-10-19
last_updated_by: Marcel Fahle
last_updated_note: "Mux Player is the sole supported implementation"
---

# Research: Anonymous Video Progress Tracking (BOLD-728, BOLD-729)

**Date**: 2025-10-19T04:08:46+0000
**Researcher**: Marcel Fahle
**Git Commit**: e35f4abaf4658ba79df5c65f04e90f33baf2de10
**Branch**: main
**Repository**: bold-nextjs-tailwind-starter

## Research Question

What does the current codebase look like for implementing anonymous video progress tracking (YouTube-style progress bars and resume functionality) as described in BOLD-728 and BOLD-729?

**Context from Linear**:
- **BOLD-728** (Epic): Frontend implementation of anonymous video progress (v1)
  - Local progress storage and retrieval (`ProgressStore`)
  - React hook for player integration (`useVideoProgress`)
  - Thumbnail progress bars and resume prompts
  - Opt-out toggle ("Remember progress on this device")
  - Cross-tab synchronization
  - ADR + test coverage
- **BOLD-729** (Subtask): Write ADR documenting the architectural decision
  - Store anonymous progress locally in IndexedDB
  - Forward-compatible schema for eventual server sync
  - Key namespace: `${tenantId}:${videoId}`

## Summary

The codebase currently has:
- ✅ Mux Player implementation with refs exposed for event handling
- ✅ Video thumbnail components throughout the UI
- ✅ Playlist navigation and autoplay functionality
- ✅ Basic localStorage usage for autoplay preferences (pattern to follow)
- ✅ Time tracking hook (`useCurrentPlayerTime`) already implemented
- ❌ **No IndexedDB implementation** - needs to be created from scratch
- ❌ **No ADR documentation structure** - `/docs/adr/` directory doesn't exist
- ❌ **No video progress tracking** - no storage, UI, or hooks for progress

**Note**: The Vidstack player implementation has been removed; only Mux Player is supported.

**Foundation exists** for adding progress tracking, but the core storage mechanism (IndexedDB wrapper), progress UI components (progress bars on thumbnails, resume prompts), and architectural documentation (ADR) need to be created from scratch.

## Detailed Findings

### 1. Video Player Implementation

**Current State**: The codebase uses **Mux Player** (`@mux/mux-player-react`) as the video player implementation.

**Core Player Files**:
- `components/players/player-mux.tsx` - Mux player with chapter support, autoplay, theming
- `components/players/index.ts` - Exports MuxPlayer as default Player
- `util/use-current-player-time.ts` - Hook for tracking current playback time using `useSyncExternalStore`

**Player Features Available for Progress Tracking**:
- ✅ Player refs exposed via `forwardRef` (accessible for listening to events)
- ✅ Time tracking via `useCurrentPlayerTime` hook (already implemented)
- ✅ Chapter navigation support (WebVTT parsing)
- ✅ Autoplay handling on video end
- ✅ HLS streaming support via Mux

**Key Integration Point** (`components/video-detail.tsx:75-80`):
```typescript
const playerRef = useRef<HTMLVideoElement | null>(null);

// Hook already tracks current time
const currentTime = useCurrentPlayerTime(playerRef);
```

This `playerRef` can be used to:
- Listen to `timeupdate` events for periodic progress saves
- Listen to `ended` events to mark video as complete
- Seek to saved position on mount (resume functionality)

**Video End Handler** (`components/video-detail.tsx:150-155`):
```typescript
const handleVideoEnded = useCallback(() => {
  if (isAutoplay && hasNextVideo && nextVideo && playlist) {
    router.push(`/pl/${playlist.id}/v/${nextVideo.id}`);
  }
}, [isAutoplay, hasNextVideo, nextVideo, playlist, router]);
```

This is where we'd add completion tracking (mark video as 100% watched).

---

### 2. Video Thumbnail Components

**Current State**: Thumbnails are displayed throughout the app but **do not show progress bars**.

**Key Thumbnail Components**:
- `components/video-thumbnail.tsx` - Main thumbnail component (renders image, title, duration)
- `components/playlist-sidebar.tsx` - Sidebar thumbnails for playlist navigation
- `components/featured-playlist.tsx` - Grid of thumbnails on homepage
- `components/search-results.tsx` - Thumbnails in search results
- `components/playlist-video-list.tsx` - List of videos in playlist format

**Current Thumbnail Structure** (`components/video-thumbnail.tsx:15-35`):
```typescript
<div className="aspect-video group relative">
  <Image
    src={video.thumbnail_url}
    alt={video.title}
    width={640}
    height={360}
    className="rounded-md object-cover"
  />
  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-sm">
    {formatDuration(video.duration)}
  </div>
  <h3 className="mt-4 font-semibold text-lg">
    <Link href={playlistId ? `/pl/${playlistId}/v/${video.id}` : `/v/${video.id}`}>
      {video.title}
    </Link>
  </h3>
</div>
```

**What's Missing for Progress Tracking**:
- ❌ No progress bar overlay on thumbnail
- ❌ No "resume from X%" indicator
- ❌ No completion state visual indicator (checkmark, "watched" badge)
- ❌ No fetching of progress data from storage

**Where to Add Progress Bar**:
Add a progress bar overlay inside the `aspect-video` container, positioned at the bottom of the thumbnail image. YouTube-style would be a thin bar (3-4px height) with a filled portion showing percentage watched.

---

### 3. Client-Side Storage

**Current State**: Only **localStorage** is used for autoplay preference. **No IndexedDB**.

**Existing Storage Pattern** (`components/providers/playlist-provider.tsx:25-60`):
```typescript
const AUTOPLAY_STORAGE_KEY = 'bold-autoplay';
const LEGACY_STORAGE_KEY = 'bold-continuous-play';

const [isAutoplay, setIsAutoplay] = useState<boolean>(false);
const [mounted, setMounted] = useState(false);

// Hydration-safe pattern
useEffect(() => {
  setMounted(true);
}, []);

useEffect(() => {
  if (mounted) {
    const stored = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (stored !== null) {
      setIsAutoplay(stored === 'true');
    } else if (legacy !== null) {
      // Migrate from legacy key
      setIsAutoplay(legacy === 'true');
      localStorage.setItem(AUTOPLAY_STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }
}, [mounted]);

const handleToggleAutoplay = () => {
  const newValue = !isAutoplay;
  setIsAutoplay(newValue);
  if (mounted) {
    localStorage.setItem(AUTOPLAY_STORAGE_KEY, String(newValue));
  }
};
```

**Pattern to Follow**:
- ✅ Hydration-safe with `mounted` state check
- ✅ Legacy key migration support
- ✅ Simple read/write with error handling (graceful degradation)

**In-Memory Caching Pattern** (`components/players/player-mux.tsx:15-25`):
```typescript
const chaptersCache = new Map<string, any>();

// Cache parsed chapter data
if (video.chapters_url) {
  if (chaptersCache.has(video.chapters_url)) {
    setChapters(chaptersCache.get(video.chapters_url));
  } else {
    // Fetch and cache
    const parsed = parseChapters(chaptersData);
    chaptersCache.set(video.chapters_url, parsed);
    setChapters(parsed);
  }
}
```

**What's Missing for Progress Tracking**:
- ❌ No IndexedDB wrapper or utility library
- ❌ No progress storage mechanism
- ❌ No cross-tab synchronization for progress
- ❌ No throttling mechanism for writes
- ❌ No error recovery or fallback strategies

**Server-Side Caching** (not relevant for client progress):
- `lib/cached-client.ts` - Next.js ISR caching wrapper for Bold API calls (server-side only)

---

### 4. Tenant and Video ID Structure

**Video Identification Patterns**:

**Pattern 1: Route Parameters** (`app/(default)/v/[id]/page.tsx:56-70`):
```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: video } = await bold.videos.get(id);
  return {
    title: video.title,
    description: video.description,
  };
}
```

**Pattern 2: Video Object Structure** (from Bold SDK):
```typescript
interface Video {
  id: string;              // Primary video ID (used in URLs and API calls)
  title: string;
  duration: number;        // Duration in seconds (important for progress %)
  thumbnail_url: string;
  published_at: string;
  transcript?: object;
  chapters?: string;       // WebVTT URL
  // ... other fields
}
```

**Pattern 3: Search Results** (`lib/search.ts:4-29`):
```typescript
export type SearchHit = {
  internal_id: string;     // Full internal ID
  short_id: string;        // Shortened ID for URLs
  title: string;
  duration: number;
  // ...
};

// Usage: Prefer short_id over internal_id
<Link href={`/v/${hit.short_id || hit.internal_id}`}>
```

**Pattern 4: Playlist Context** (`app/(default)/pl/[id]/v/[videoId]/page.tsx:16-30`):
```typescript
export async function generateStaticParams() {
  const { data: playlists } = await bold.playlists.list();

  const paths: { id: string; videoId: string }[] = [];

  for (const playlist of playlists) {
    for (const video of playlist.videos) {
      paths.push({
        id: playlist.id,      // Playlist ID
        videoId: video.id,    // Video ID
      });
    }
  }

  return paths;
}
```

**Tenant Identification**:

**Pattern 1: Implicit via API Key** (`client.ts:1-6`):
```typescript
import { createClient } from "@boldvideo/bold-js";

export const bold = createClient(
  process.env.NEXT_PUBLIC_BOLD_API_KEY as string
);
```

- Tenant is implicit in the API key
- No explicit tenant ID passed in most code
- Single-tenant setup (one deployment per tenant)

**Pattern 2: Explicit Subdomain** (`components/ui/ai-assistant/index.tsx:20-30`):
```typescript
interface AIAssistantProps {
  videoId: string;
  subdomain: string;  // Explicit tenant identifier for multi-tenant AI
}

// Usage in video-detail.tsx:
<AIAssistant
  videoId={video.id}
  subdomain="" // Empty string for single-tenant
  // ...
/>
```

**Pattern 3: Backend URL** (`app/api/search/route.ts:37-45`):
```typescript
const apiHost = process.env.BACKEND_URL || "https://api.boldvideo.io";
const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;

// API key is tenant-scoped
const response = await fetch(endpoint, {
  headers: {
    "Content-Type": "application/json",
    Authorization: apiKey,
  },
});
```

**Key Structure for IndexedDB** (per BOLD-729 spec):
```
Key: ${tenantId}:${videoId}
```

**Open Question**: How to extract `tenantId`?
- Option 1: Parse from API key (if it contains tenant info)
- Option 2: Call `bold.settings()` and extract workspace/tenant ID from response
- Option 3: Use subdomain from `window.location.hostname`
- Option 4: Use a constant/env var for single-tenant deployments

---

### 5. ADR Documentation

**Current State**: ❌ **No ADR structure exists**.

**Existing Documentation Files**:
- `README.md` - Project documentation (setup, features, deployment)
- `AUTH.md` - Authentication documentation
- `CLAUDE.md` - Coding guidelines for AI assistants
- `RELEASE-NOTES.md` - Release notes

**What's Missing**:
- ❌ `/docs/` directory does not exist
- ❌ `/docs/adr/` directory does not exist
- ❌ No ADR template or format
- ❌ No existing architectural decision records
- ❌ No numbering scheme or index

**Action Required for BOLD-729**:
Create `/docs/adr/` directory structure and write first ADR from scratch. Suggest using standard ADR format:

```markdown
# ADR-0001: Anonymous Video Progress Storage

## Status
Proposed / Accepted / Deprecated / Superseded

## Context
[Problem statement and constraints]

## Decision
[What we decided to do]

## Alternatives Considered
[Other options we evaluated]

## Consequences
[Positive and negative outcomes]
```

**BOLD-729 Requirements**:
- Context: No user auth on portal, need YouTube-like progress bars and resume
- Decision: IndexedDB with key `${tenantId}:${videoId}`, value `ProgressV1`, throttled writes, completion threshold, optional `ranges`
- Alternatives: localStorage (sync/blocking, hard to evolve), cookies (size limits), server-only (requires auth)
- Consequences: Tiny client footprint, smooth path to server sync later

---

### 6. Playlist & Autoplay Features

**Current State**: ✅ Full playlist navigation with autoplay toggle.

**Playlist Navigation** (`components/video-detail.tsx:132-145`):
```typescript
const currentVideoIndex =
  playlist?.videos.findIndex((v) => v.id === video.id) ?? -1;

const hasPreviousVideo = playlist && currentVideoIndex > 0;
const hasNextVideo =
  playlist &&
  currentVideoIndex >= 0 &&
  currentVideoIndex < playlist.videos.length - 1;

const previousVideo = hasPreviousVideo
  ? playlist.videos[currentVideoIndex - 1]
  : null;

const nextVideo = hasNextVideo
  ? playlist.videos[currentVideoIndex + 1]
  : null;
```

**Autoplay on Video End** (`components/video-detail.tsx:150-155`):
```typescript
const handleVideoEnded = useCallback(() => {
  if (isAutoplay && hasNextVideo && nextVideo && playlist) {
    router.push(`/pl/${playlist.id}/v/${nextVideo.id}`);
  }
}, [isAutoplay, hasNextVideo, nextVideo, playlist, router]);
```

**Autoplay Toggle Component** (`components/autoplay-toggle.tsx:1-30`):
```typescript
export function AutoplayToggle() {
  const { isAutoplay, handleToggleAutoplay } = usePlaylistContext();

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isAutoplay}
        onCheckedChange={handleToggleAutoplay}
        id="autoplay"
      />
      <label htmlFor="autoplay">Autoplay</label>
    </div>
  );
}
```

**Integration Point for Progress**:
- The `handleVideoEnded` callback is where we'd mark video as complete (100% progress)
- Could also update "last watched" timestamp for playlist position tracking
- Resume functionality would complement autoplay (resume where left off, then autoplay next)

**Playlist Sidebar** (`components/playlist-sidebar.tsx:60-80`):
Shows list of videos with thumbnails - this is where progress bars would be most useful for seeing which videos in a playlist are partially watched or completed.

---

## Code References

### Files to Create (New):

1. **`lib/progress-store.ts`** - IndexedDB wrapper
   - Schema: `{ videoId, tenantId, position, duration, percentWatched, completed, lastWatched, ranges? }`
   - Methods: `getProgress(videoId)`, `saveProgress(videoId, data)`, `clearProgress(videoId)`, `getAllProgress()`
   - Error handling and fallback strategies
   - Cross-tab sync via BroadcastChannel or storage events

2. **`hooks/use-video-progress.ts`** - React hook for player integration
   - Manages progress state
   - Listens to player events (timeupdate, ended, seeking)
   - Throttles writes to IndexedDB (every 2-5 seconds)
   - Returns: `{ progress, saveProgress, clearProgress, isComplete }`

3. **`components/progress-bar.tsx`** - Progress bar overlay for thumbnails
   - Displays horizontal bar with filled portion (0-100%)
   - Styling similar to YouTube (thin bar at bottom of thumbnail)
   - Optional completion indicator

4. **`components/resume-prompt.tsx`** - Resume dialog/toast
   - Shows "Resume from X:XX" prompt when progress exists
   - Buttons: "Resume" and "Start Over"
   - Auto-dismiss after timeout

5. **`components/progress-toggle.tsx`** - Settings toggle
   - "Remember progress on this device" checkbox
   - Similar pattern to `autoplay-toggle.tsx`
   - Stores preference in localStorage

6. **`docs/adr/adr-0001-anonymous-progress.md`** - ADR document
   - Standard ADR format
   - Documents IndexedDB decision and rationale

### Files to Modify (Existing):

1. **`components/video-thumbnail.tsx:15-35`** - Add progress bar overlay
   - Import `ProgressBar` component
   - Fetch progress from IndexedDB on mount
   - Pass progress percentage to ProgressBar

2. **`components/video-detail.tsx:75-160`** - Integrate progress tracking
   - Use `useVideoProgress` hook
   - Add resume prompt on mount if progress exists
   - Save progress on timeupdate events (throttled)
   - Mark complete on ended event
   - Seek to saved position when resuming

3. **`components/playlist-sidebar.tsx:60-80`** - Add progress to video list
   - Fetch progress for all videos in playlist
   - Display progress bars or completion indicators
   - Optional: Sort by recently watched

### Example Implementation Patterns:

**Player Event Integration** (add to `components/video-detail.tsx`):
```typescript
const { progress, saveProgress, clearProgress } = useVideoProgress(video.id);

useEffect(() => {
  const player = playerRef.current;
  if (!player) return;

  const handleTimeUpdate = () => {
    // Throttled save to IndexedDB
    saveProgress({
      position: player.currentTime,
      duration: video.duration,
      lastWatched: new Date().toISOString(),
    });
  };

  const handleEnded = () => {
    // Mark as complete
    saveProgress({
      position: video.duration,
      duration: video.duration,
      completed: true,
      lastWatched: new Date().toISOString(),
    });

    // Existing autoplay logic
    if (isAutoplay && hasNextVideo && nextVideo && playlist) {
      router.push(`/pl/${playlist.id}/v/${nextVideo.id}`);
    }
  };

  player.addEventListener('timeupdate', handleTimeUpdate);
  player.addEventListener('ended', handleEnded);

  return () => {
    player.removeEventListener('timeupdate', handleTimeUpdate);
    player.removeEventListener('ended', handleEnded);
  };
}, [video.id, video.duration, isAutoplay, hasNextVideo, nextVideo, playlist]);

// Resume on mount
useEffect(() => {
  if (progress && progress.position > 0 && !progress.completed) {
    // Show resume prompt or auto-seek
    showResumePrompt(progress.position);
  }
}, [progress]);
```

**Thumbnail Progress Bar** (modify `components/video-thumbnail.tsx`):
```typescript
const { progress } = useVideoProgress(video.id);

return (
  <div className="aspect-video group relative">
    <Image src={video.thumbnail_url} />

    {/* Progress bar overlay */}
    {progress && progress.percentWatched > 0 && (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress.percentWatched}%` }}
        />
      </div>
    )}

    {/* Duration or completion indicator */}
    <div className="absolute bottom-2 right-2">
      {progress?.completed ? (
        <CheckCircle className="w-6 h-6 text-primary" />
      ) : (
        <span>{formatDuration(video.duration)}</span>
      )}
    </div>
  </div>
);
```

---

## Architecture Patterns to Follow

Based on existing codebase conventions:

### 1. File Organization
- **Utilities**: `lib/` or `util/` directory
  - Example: `util/format-duration.ts`, `lib/search.ts`
  - Progress store should go in `lib/progress-store.ts`
- **Hooks**: `hooks/` directory or co-located in `util/`
  - Example: `util/use-current-player-time.ts`
  - Progress hook should go in `hooks/use-video-progress.ts` or `util/use-video-progress.ts`
- **Components**: `components/` directory
  - Group related components in subdirectories (e.g., `components/players/`)
  - Progress components: `components/progress-bar.tsx`, `components/resume-prompt.tsx`
- **Types**: Co-located with implementations
  - Define interfaces at component/utility level
  - Export types alongside implementation

### 2. Naming Conventions (from CLAUDE.md)
- **PascalCase**: Components and component files
  - `VideoThumbnail`, `ProgressBar`, `ResumePrompt`
- **camelCase**: Functions, variables, hooks
  - `useVideoProgress`, `saveProgress`, `formatDuration`
- **kebab-case**: Filenames and CSS classes
  - `video-thumbnail.tsx`, `use-video-progress.ts`
  - Tailwind classes: `bg-primary`, `text-foreground`

### 3. TypeScript Patterns
- **Explicit typing** for function params and return types
  ```typescript
  export function formatDuration(seconds: number): string {
    // ...
  }
  ```
- **Interfaces at component level**
  ```typescript
  interface VideoThumbnailProps {
    video: Video;
    prefetch?: boolean;
    playlistId?: string;
  }
  ```
- **Use SDK types** from `@boldvideo/bold-js` when available
  ```typescript
  import type { Video, Playlist, Settings } from "@boldvideo/bold-js";
  ```

### 4. Component Patterns
- **"use client" directive** for client components
  ```typescript
  "use client";

  export function ProgressBar({ progress }: ProgressBarProps) {
    // ...
  }
  ```
- **Next.js App Router conventions**
  - Server components by default
  - Client components only when needed (interactivity, browser APIs)
- **Prefer arrow functions**
  ```typescript
  const handleClick = () => {
    // ...
  };
  ```

### 5. Error Handling Patterns
- **Default values in destructuring**
  ```typescript
  const { data: video } = await bold.videos.get(id);
  const videos = data ?? null;
  ```
- **Optional chaining**
  ```typescript
  const title = video?.title ?? 'Untitled';
  ```
- **Graceful degradation for storage**
  ```typescript
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Unable to save to localStorage:', error);
    // Continue without saving
  }
  ```

### 6. Styling (from CLAUDE.md)
- **Tailwind CSS** for all styling
- **className prop** for component styling
- **2-space indentation**
- **Semicolons** at end of statements

---

## Cross-Tab Synchronization

**Pattern to Follow**: Similar to playlist provider state management, but with cross-tab sync.

**Current Pattern** (`playlist-provider.tsx`):
- React Context for state
- localStorage for persistence
- No cross-tab sync currently

**Needed for Progress Tracking**:

**Option 1: BroadcastChannel API**
```typescript
const channel = new BroadcastChannel('bold-progress');

// Send update to other tabs
channel.postMessage({
  type: 'progress-update',
  videoId: video.id,
  progress: { position, duration, completed },
});

// Listen for updates from other tabs
channel.onmessage = (event) => {
  if (event.data.type === 'progress-update') {
    refreshProgress(event.data.videoId);
  }
};
```

**Option 2: Storage Events** (fallback for older browsers)
```typescript
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    // IndexedDB doesn't fire storage events, but we can use
    // localStorage as a sync flag
    if (e.key === 'bold-progress-sync') {
      // Refresh progress from IndexedDB
      refreshAllProgress();
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);

// When saving to IndexedDB, ping other tabs
const saveProgressWithSync = async (data) => {
  await saveToIndexedDB(data);
  // Trigger sync in other tabs
  localStorage.setItem('bold-progress-sync', Date.now().toString());
};
```

**Recommendation**: Use BroadcastChannel with storage events as fallback.

---

## Open Questions

### 1. Tenant ID Extraction
**Question**: How to get `tenantId` for IndexedDB key `${tenantId}:${videoId}`?

**Options**:
- A) Parse from API key (if it contains tenant info)
- B) Call `bold.settings()` and extract workspace ID from response
- C) Use subdomain from `window.location.hostname`
- D) Use constant/env var for single-tenant deployments (e.g., "default")
- E) Use just `videoId` as key (simplest, assumes single-tenant)

**Recommendation**: Start with option D or E for v1 (single-tenant assumption), make tenant ID configurable for future multi-tenant support.

### 2. Completion Threshold
**Question**: What percentage watched qualifies as "complete"?

**Options**:
- 90% (YouTube-like)
- 95% (stricter)
- 100% (exact)

**Considerations**:
- Users rarely watch final credits/outro
- Too low might mark incomplete videos as done
- Should be configurable in ADR

**Recommendation**: 90% as default, configurable in settings.

### 3. Throttle Frequency
**Question**: How often to write progress to IndexedDB?

**Options**:
- Every 1 second (high frequency, more DB writes)
- Every 2-3 seconds (balanced)
- Every 5 seconds (lower frequency, risk of data loss)

**Considerations**:
- Performance impact of frequent writes
- Risk of data loss if tab closes
- User expectation of accuracy

**Recommendation**: 2-3 seconds with write on pause/seeking/ended events.

### 4. Opt-Out vs Opt-In
**Question**: Should progress tracking be enabled by default?

**BOLD-728 Spec**: "Opt-out toggle" implies ON by default.

**Options**:
- A) ON by default (opt-out)
- B) OFF by default (opt-in)

**Recommendation**: ON by default (per spec), with clear UI to disable.

### 5. Resume Behavior
**Question**: Automatically seek to saved position or show prompt?

**Options**:
- A) Auto-seek without prompt (seamless)
- B) Show prompt with "Resume" / "Start Over" options (user control)
- C) Small toast with countdown to auto-resume (dismissible)

**Recommendation**: Option B for v1 (user control), consider option C for v2.

### 6. Progress Data Schema
**Question**: What fields should be stored in IndexedDB?

**Minimum**:
- `videoId: string`
- `position: number` (seconds)
- `duration: number` (seconds)
- `percentWatched: number` (0-100)
- `completed: boolean`
- `lastWatched: string` (ISO timestamp)

**Optional (per BOLD-729 spec)**:
- `ranges: { start: number, end: number }[]` (for accuracy, future enhancement)
- `tenantId: string` (for multi-tenant)
- `version: number` (schema version for migrations)

**Recommendation**: Start with minimum fields + `version: 1` for forward compatibility.

---

## Next Steps

### For BOLD-729 (ADR - Priority 1):

1. ✅ Create `/docs/adr/` directory
2. ✅ Write `adr-0001-anonymous-progress.md` with:
   - **Context**: No user auth on portal, need YouTube-like progress and resume
   - **Decision**: IndexedDB with key `${tenantId}:${videoId}`, value `ProgressV1`
   - **Alternatives**: localStorage (limited, blocking), cookies (size), server-only (requires auth)
   - **Consequences**: Client-only, forward-compatible for server sync
   - **Schema**: Define ProgressV1 interface
   - **Completion threshold**: 90% default
   - **Throttling**: 2-3 second write interval
   - **Cross-tab sync**: BroadcastChannel + storage events

### For BOLD-728 (Implementation - Priority 2):

**Phase 1: Core Storage**
1. Create `lib/progress-store.ts` (IndexedDB wrapper)
   - Database name: `bold-video-progress`
   - Object store: `progress` with key `videoId` (or `${tenantId}:${videoId}`)
   - Methods: get, save, delete, list
   - Error handling and fallback

**Phase 2: React Integration**
2. Create `hooks/use-video-progress.ts` (player hook)
   - State management for progress
   - Throttled save logic (2-3s interval)
   - Event handlers for timeupdate, ended, pause, seeking

**Phase 3: UI Components**
3. Create `components/progress-bar.tsx` (thumbnail overlay)
   - Horizontal bar with filled portion
   - Completion indicator (checkmark)
4. Create `components/resume-prompt.tsx` (dialog/toast)
   - "Resume from X:XX" message
   - Resume / Start Over buttons
5. Create `components/progress-toggle.tsx` (settings)
   - "Remember progress" checkbox
   - localStorage for preference

**Phase 4: Integration**
6. Modify `components/video-thumbnail.tsx`
   - Fetch progress on mount
   - Render ProgressBar component
7. Modify `components/video-detail.tsx`
   - Use useVideoProgress hook
   - Add resume prompt
   - Handle player events
8. Add cross-tab synchronization
   - BroadcastChannel for modern browsers
   - Storage events as fallback

**Phase 5: Testing**
9. Test edge cases:
   - Multiple tabs open (cross-tab sync)
   - Browser restart (persistence)
   - Incognito mode (graceful degradation)
   - Storage quota exceeded (error handling)
   - Very long videos (accuracy)
   - Playlist navigation (progress updates)

**Phase 6: Documentation**
10. Update README.md with progress feature
11. Add inline code comments
12. Create migration guide if schema changes

---

## Related Research

No related research documents found in `thoughts/shared/research/` (this is the first research document).

---

## Additional Notes

### Performance Considerations
- IndexedDB is asynchronous (non-blocking)
- Write throttling is critical for long videos
- Consider batching writes for playlists
- Cache progress in memory to reduce DB reads

### Privacy Considerations
- All data stored locally (no server transmission in v1)
- Users can clear browser data to reset
- Incognito mode should gracefully degrade (no storage)
- Consider adding "Clear all progress" button in settings

### Future Enhancements (Post-v1)
- Server sync when authentication added
- Accurate range tracking (not just single position)
- Playlist-level progress (X of Y videos watched)
- Watch history (separate from progress)
- Analytics (watch time, completion rate)
- Offline support via Service Worker
- Export/import progress data
