# BOLD Next.js Tailwind Starter Commands & Guidelines

This is a starter kit for building video portals with BOLD. When writing changelogs and release notes, focus on user-facing features and benefits rather than technical implementation details.

## Branch Information
- **main** branch: For all customers (deployed to Vercel)
- **custom/yo** branch: For the Yo customer with specific customizations (deployed to Vercel)

## Build & Development

- `pn run dev` - Start development server (using pnpm aliased as pn)
- `pn run build` - Build for production
- `pn run start` - Start production server
- `pn run lint` - Run ESLint

## Project Structure

- Main app code is in the `app/(default)` route group
- `/s` is the search results route (not `/search`)
- Search functionality appears in two views:
  - Quick search dropdown in header (shows 3 results with "See all results" button)
  - Full search results page at `/s?q=query`
- Using Tailwind v4 with import syntax (`@import "tailwind";`)

## Code Style Guidelines

- **Imports**: External deps first, then Next.js imports, then local imports using absolute paths
- **TypeScript**: Use explicit typing for function params and return types; define interfaces at component level
- **Naming**:
  - PascalCase for components and files (VideoThumbnail)
  - camelCase for functions, variables, hooks (useCurrentPlayerTime)
  - kebab-case for CSS classes and utility files
- **Components**:
  - Mark client components with "use client" directive
  - Organize by functionality in components directory
  - Follow Next.js App Router conventions
- **Formatting**: 2-space indentation, semicolons, prefer arrow functions
- **Styling**: Use Tailwind CSS for styling with className prop
- **Error Handling**: Provide default values in destructuring, use optional chaining, null checks

## Search System Architecture

The search functionality consists of two main components that work together to provide both instant preview and comprehensive search results:

### 1. Header Search with Live Preview
- **SearchBar Component** (`components/search-bar.tsx`): 
  - Input field in the header with keyboard shortcuts (Cmd+K to focus)
  - Updates URL parameters as the user types (reactive search)
  - Submits to `/s` route when user presses Enter
  - Shows ESC hint when focused, Cmd+K hint when unfocused
  - Clear button (X) to reset search

- **SearchPreview Component** (`components/search-preview.tsx`):
  - Displays live search results directly below the header
  - Shows maximum of 3 results with "See all X results" button
  - Fetches results via POST request to `/api/search`
  - Displays video thumbnails, titles, and descriptions
  - Shows transcript segments with clickable timestamps
  - Expandable segments (shows 2 by default, can expand to see all)
  - Only visible when NOT on the search results page (`/s`)
  - Automatically hidden when navigating to search page

### 2. Full Search Results Page (`/s` route)
- **Page Component** (`app/(default)/s/page.tsx`):
  - Server component that renders the search page structure
  - Displays "Search Results" heading when query exists

- **SearchResults Component** (`components/search-results.tsx`):
  - Client component that fetches and displays all search results
  - Shows total match count (e.g., "15 matches for 'query'")
  - Larger thumbnails (240px vs 200px in preview)
  - Full transcript segments always visible
  - Loading state with spinner
  - Error state handling
  - Empty state when no query provided
  - No results state with helpful message

### 3. Mobile Search
- **MobileSearch Component** (`components/mobile-search.tsx`):
  - Toggle button (magnifying glass/X icon) in mobile header
  - Opens full-width overlay below header when activated
  - Auto-focuses search input when opened
  - Closes automatically on route change

## Search Implementation Details

### API Flow
1. User types in SearchBar → Updates URL parameter `?q=query`
2. SearchPreview/SearchResults components detect URL change
3. Components make POST request to `/api/search` with query
4. API route (`app/api/search/route.ts`) forwards request to BOLD API
5. BOLD API endpoint: `https://api.boldvideo.io/api/v1/search`
6. Results returned include video metadata and matching transcript segments

### Data Structure
- **SearchHit Type** (`lib/search.ts`):
  - Video metadata: `internal_id`, `short_id`, `title`, `thumbnail`, `description`, `duration`
  - Match information: `has_metadata_match`, `metadata_matches`
  - Transcript segments with timestamps and highlighted text
  - Each segment includes `start_time`, `end_time`, `text`, `highlighted_text`

### Key Features
- **Reactive Search**: URL parameters update as user types (no need to press Enter)
- **Highlighted Matches**: Search terms highlighted in results using `<mark>` tags
- **Clickable Timestamps**: Each segment timestamp links to video at that time (`/v/[id]?t=seconds`)
- **Keyboard Shortcuts**: Cmd+K to focus search, ESC to clear and unfocus
- **Performance**: Results cached during session, POST requests avoid URL length issues
- **Accessibility**: Proper ARIA labels, keyboard navigation support

### Environment Variables Required
- `BACKEND_URL`: BOLD API endpoint (defaults to `https://api.boldvideo.io`)
- `NEXT_PUBLIC_BOLD_API_KEY`: API key for authentication

