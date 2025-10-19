# Debugging Progress Tracking

## What I Fixed

### Issue 1: Resume Position Not Working ✅
**Problem**: Video wasn't resuming from saved position on refresh.

**Root Cause**: The `useVideoProgress` hook was returning `resumePosition`, but I was trying to manually set `playerRef.current.currentTime` instead of passing it to the Player component's `startTime` prop.

**Fix**: Changed `video-detail.tsx` to:
1. Calculate `effectiveStartTime = startTime || resumePosition || undefined`
2. Pass `effectiveStartTime` to the Player component's `startTime` prop
3. Let the Player component handle seeking (it already has proper logic for this)

### Issue 2: Progress Bars Not Showing on Thumbnails ✅
**Problem**: No progress bars visible on video thumbnails.

**Root Cause**: The `VideoThumbnail` component was updated to accept a `progress` prop, but the pages using it were server components and couldn't access the client-side `ProgressProvider` context.

**Fix**: Created `VideoThumbnailWithProgress` wrapper component that:
1. Is a client component ("use client")
2. Uses `useProgress()` hook to access progress data
3. Looks up progress for each video from `progressMap`
4. Passes it to the base `VideoThumbnail` component

Updated these files to use the wrapper:
- `app/(default)/page.tsx`
- `components/featured-playlist.tsx`

### Issue 3: Muted State Not Persisting ⚠️
**Note**: This is a separate issue from progress tracking. The muted state would need its own localStorage implementation similar to the autoplay toggle. Not part of this feature.

### Issue 4: Progress Bars Not Showing on Playlist Pages ✅
**Problem**: Progress bars were showing on the homepage but not on playlist pages or in the sidebar.

**Root Cause**: The `PlaylistVideoList` and `PlaylistSidebar` components weren't using the `ProgressProvider` context.

**Fix**:
1. Made `PlaylistVideoList` a client component
2. Added `useProgress()` hook to both components
3. Added progress bar and completion indicator display logic
4. Progress updates automatically via React's reactivity when `progressMap` changes

### Issue 5: Completion Indicator Looks Weird in Sidebar ✅
**Problem**: The checkmark icon looked cramped in the small sidebar thumbnails.

**Fix**: Removed the completion indicator from the sidebar - now always shows duration badge. Progress bar still shows, so you can see completion visually.

### Issue 6: Sidebar Progress Not Updating Live ✅
**Problem**: Sidebar progress bars only updated on page refresh, not while watching.

**Root Cause**: `BroadcastChannel` only sends messages to OTHER tabs, not the current tab.

**Fix**: Added `sameTabListeners` array in `lib/progress/sync.ts`:
1. When `broadcastProgressUpdate()` is called, it notifies same-tab listeners immediately
2. `ProgressProvider` receives the message and refreshes from IndexedDB
3. Sidebar re-renders with updated progress every 2.5 seconds while watching!

## How Real-Time Updates Work

The progress bars update automatically as you watch videos! Here's how:

### In the Current Tab (Video Player)
1. **Player Events**: As the video plays, the `useVideoProgress` hook listens to `timeupdate` events
2. **Throttled Saves**: Progress is saved to IndexedDB every 2.5 seconds
3. **Broadcast**: Each save broadcasts a message via `BroadcastChannel` (or localStorage fallback)
4. **Local State Update**: The hook updates its local state immediately after saving

### In Other Tabs
1. **Sync Listener**: The `ProgressProvider` listens for broadcast messages from other tabs
2. **Refresh**: When a message arrives, it refreshes all progress from IndexedDB
3. **React Update**: The `progressMap` state updates, triggering re-renders
4. **UI Updates**: All components using `useProgress()` automatically show the new progress

### In the Sidebar (Same Tab) - LIVE UPDATES! ✨
1. **Same-Tab Broadcast**: When progress saves, it notifies listeners in the SAME tab immediately
2. **Provider Refresh**: `ProgressProvider` receives the message and refreshes from IndexedDB
3. **React Update**: The `progressMap` state updates, triggering re-renders
4. **Live Progress**: You see the progress bar grow in the sidebar as you watch! (every 2.5s)

**Key Insight**: BroadcastChannel only sends to OTHER tabs, so we added `sameTabListeners` to handle updates within the current tab. This enables real-time sidebar updates!

**Key Components**:
- `lib/progress/sync.ts` - BroadcastChannel/localStorage cross-tab messaging
- `components/providers/progress-provider.tsx` - Global progress state & sync listener
- `hooks/use-video-progress.ts` - Video player integration & progress saving
- All thumbnail components - Subscribe to `progressMap` via `useProgress()`

## How to Debug

### 1. Check Browser Console

When you refresh a video page, you should see:
```
[VideoDetail] Progress Debug: {
  videoId: "w7mxw",
  resumePosition: 547.463685,
  startTime: undefined,
  effectiveStartTime: 547.463685,
  progressEnabled: true
}
```

### 2. Check IndexedDB

Open DevTools → Application → IndexedDB → `bold-video-progress` → `progress`

You should see records like:
```
Key: "bt_saasacademy:w7mxw"
Value: {
  id: "bt_saasacademy:w7mxw",
  videoId: "w7mxw",
  tenantId: "bt_saasacademy",
  position: 547.463685,
  duration: 1516.8,
  percentWatched: 36.09,
  completed: false,
  lastWatched: "2025-10-19T05:44:38.303Z",
  version: 1
}
```

### 3. Check Progress Bar Rendering

On the homepage or playlist page, inspect a video thumbnail. You should see:
- A progress bar element at the bottom if `percentWatched > 0`
- A checkmark indicator instead of duration badge if `completed: true`

### 4. Test Resume Functionality

1. Watch a video for ~1 minute
2. Note the timestamp (e.g., 1:30)
3. Refresh the page
4. Check console for `[VideoDetail] Progress Debug`
5. The video should auto-seek to your last position
6. You might see a brief flash as it seeks

### 5. Test Cross-Tab Sync

1. Open video in Tab A
2. Open same video in Tab B
3. Watch in Tab A for a bit
4. Look at IndexedDB in Tab B - should update
5. Progress bar on thumbnails should update in both tabs

## Common Issues

### Resume Position Loads But Doesn't Seek

**Check**: Does the console show `effectiveStartTime` with a value?
- If YES → Player component issue (check MuxPlayer ref)
- If NO → Progress loading issue (check hook)

### Progress Saves But Never Loads

**Check**: Console for errors in `useVideoProgress` hook
- Verify `tenantId` is not null

### Progress Bars Don't Show on Thumbnails

**Check**:
1. Is `ProgressProvider` in the layout? → ✅ Should be
2. Are thumbnails using `VideoThumbnailWithProgress`? → ✅ Should be
3. Console errors about `useProgress must be used within ProgressProvider`? → Check layout wrapper order

### Cross-Tab Sync Not Working

**Check**:
1. Browser supports BroadcastChannel (Chrome, Firefox, Edge)
2. If Safari → Uses localStorage fallback
3. Console logs for sync messages
4. Try closing/reopening tabs (sometimes needed for sync to initialize)

## Testing Checklist

- [ ] Watch video for 30s, refresh → resumes at 30s
- [ ] Watch to 50% → progress bar shows ~50% on thumbnail
- [ ] Watch to 90%+ → checkmark appears instead of duration
- [ ] Open video in 2 tabs → progress syncs between tabs
- [ ] Check IndexedDB → data is being saved correctly
- [ ] Console shows debug logs with correct resumePosition

## Files Changed

Core Progress:
- `lib/progress/types.ts` - Progress record types
- `lib/progress/store.ts` - IndexedDB operations
- `lib/progress/tenant.ts` - Tenant ID extraction
- `lib/progress/sync.ts` - Cross-tab synchronization

Hooks:
- `hooks/use-video-progress.ts` - Main progress tracking hook

Components:
- `components/progress-bar.tsx` - Progress bar overlay
- `components/completion-indicator.tsx` - Checkmark for completed videos
- `components/video-thumbnail-with-progress.tsx` - Client wrapper
- `components/providers/progress-provider.tsx` - Global progress context

Integration:
- `components/video-detail.tsx` - Player integration
- `components/video-thumbnail.tsx` - Added progress prop
- `components/video-thumbnail-with-progress.tsx` - Client wrapper for server components
- `components/featured-playlist.tsx` - Uses wrapper
- `components/playlist-video-list.tsx` - Shows progress on playlist page
- `components/playlist-sidebar.tsx` - Shows progress in sidebar (live updates!)
- `app/(default)/layout.tsx` - Added ProgressProvider
- `app/(default)/page.tsx` - Uses wrapper
