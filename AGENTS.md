# BOLD Next.js Video Portal - AI Agent Guide

A Next.js 16 starter kit for building video portals on the Bold Video platform. Features server-rendered video pages, AI-powered Q&A, playlist navigation, and progress tracking.

## Quick Start

```bash
bun dev          # Development server (localhost:3000)
bun run build    # Production build
bun start        # Start production server
bun lint         # Run ESLint
```

## Codebase Map

```
app/
├── (default)/              # Main layout group
│   ├── page.tsx           # Homepage (library/assistant/none based on config)
│   ├── layout.tsx         # Main layout with header
│   ├── v/[id]/            # Individual video pages
│   ├── pl/[id]/           # Playlist pages
│   │   └── v/[videoId]/   # Video within playlist (dual sidebar)
│   ├── coach/             # Full-screen AI coach
│   └── s/                 # Search results
├── (nolayout)/            # Routes without main layout
│   └── e/[id]/            # Embed player
├── api/                   # API routes
│   ├── ask/               # Video Q&A streaming (SSE)
│   ├── coach/             # Coach AI streaming (SSE)
│   ├── search/            # Search proxy
│   └── auth/              # NextAuth handlers
└── auth/signin/           # Sign-in page

components/
├── video/                 # Video page features (/pl/[id]/v/[videoId])
│   ├── chat/             # Video Q&A chat (right sidebar)
│   ├── companion/        # Right sidebar wrapper
│   ├── navigation/       # Left sidebar (playlist nav)
│   ├── detail/           # Video page layout
│   └── mobile/           # Mobile-specific UI
├── coach/                 # Coach page (/coach)
│   └── assistant-interface/
├── home/                  # Homepage variants
│   ├── library-homepage.tsx
│   ├── assistant-homepage.tsx
│   └── empty-homepage.tsx
├── players/               # Video player (Mux)
├── providers/             # React Context providers
└── ui/                    # Generic UI components

lib/
├── portal-config.ts       # Central configuration with defaults
├── progress/              # IndexedDB progress tracking
├── ai-question.ts         # Video Q&A logic
└── citation-helpers.ts    # AI citation processing

hooks/
├── use-video-progress.ts  # Progress tracking with IndexedDB
├── use-ask-stream.ts      # AI chat streaming (SSE)
└── use-playlist-navigation.ts

types/
├── bold-extensions.ts     # Extended Bold SDK types
└── video-detail.ts        # Video-specific types

config/
└── auth.ts                # Auth utilities

util/
├── format-duration.ts     # Time formatting
└── format-file-size.ts    # File size formatting
```

## Key Files by Task

| Task | File(s) |
|------|---------|
| Add new page | `app/(default)/your-route/page.tsx` |
| Modify video player | `components/players/player-mux.tsx` |
| Change portal config | `lib/portal-config.ts` |
| Add API endpoint | `app/api/your-endpoint/route.ts` |
| Modify types | `types/bold-extensions.ts` |
| Change theme | `app/(default)/globals.css` |
| Auth config | `auth.ts`, `config/auth.ts` |

## Core Patterns

### Data Fetching (Server Components)

```typescript
// In page.tsx (server component - default)
import { bold } from "@/client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, video] = await Promise.all([
    bold.settings().then((r) => r?.data ?? null),
    bold.videos.get(id)
  ]);

  return <VideoDetail video={video.data} settings={settings} />;
}

export const revalidate = 60; // ISR
```

### Client Components

```typescript
// Must have "use client" directive
"use client";

import { useState } from "react";

export function InteractiveComponent({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  return <div onClick={() => setPlaying(true)}>...</div>;
}
```

### Portal Configuration

```typescript
import { getPortalConfig } from "@/lib/portal-config";

const config = getPortalConfig(settings);
// config.ai.enabled, config.homepage.layout, config.theme.colorScheme, etc.
```

### Styling

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className
)} />
```

## Type Definitions

### Video (Extended)
```typescript
interface ExtendedVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  duration: number;
  playback_id: string;
  chapters_url?: string;
  ai_avatar?: string;
  ai_name?: string;
  cta?: CTA | null;
  attachments?: Attachment[];
}
```

### Settings (Portal)
```typescript
interface Settings {
  account: { id, name, subdomain, ai?: { enabled, name, avatar_url, greeting } };
  portal?: {
    layout?: { type: 'library' | 'assistant' | 'none', videos_limit, show_playlists };
    navigation?: { show_search, show_ai_search, show_header };
    display?: { show_transcripts, show_chapters };
    color_scheme?: 'toggle' | 'light' | 'dark';
  };
  theme_config?: { radius, light: ThemeColors, dark: ThemeColors };
  meta_data?: { title, description, image };
}
```

## Environment Variables

Required:
```bash
NEXT_PUBLIC_BOLD_API_KEY=     # From app.boldvideo.io/settings
```

Optional:
```bash
# Auth (when enabled)
AUTH_ENABLED=true
AUTH_PROVIDER=google          # google | workos
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# UI
NEXT_PUBLIC_LARGE_HEADER=true
PORTAL_LAYOUT_OVERRIDE=library
```

See `.env-template` for complete list.

## Architecture Highlights

### Two Chat Systems
1. **Video Q&A** (`/components/video/chat/`) - Right sidebar, video-aware, timestamp seeking
2. **Coach Chat** (`/components/coach/`) - Full-screen, conversational, clarification loop

### Dual Sidebar System
- **Left**: Playlist navigation (collapsible)
- **Right**: Chat + Chapters tabs (collapsible)
- Mobile: Exclusive mode (one at a time)

### Progress Tracking
- IndexedDB storage (`bold-progress-v1`)
- Cross-tab sync via BroadcastChannel
- Tenant-isolated (subdomain-based)
- 90% completion threshold

## Code Style

- **Imports**: External deps, then Next.js, then local (`@/`)
- **TypeScript**: Explicit types, interfaces at component level
- **Naming**: PascalCase components, camelCase functions, kebab-case utils
- **Components**: `"use client"` for client components
- **Formatting**: 2-space indent, semicolons, arrow functions
- **Styling**: Tailwind CSS, `cn()` for conditionals

## Documentation

- `ARCHITECTURE.md` - Two-chat system, component organization
- `STATE_MANAGEMENT.md` - State management philosophy
- `AUTH.md` - Authentication setup
- `API_CITATION_SPEC.md` - AI citation format
- `thoughts/` - Development research and planning

## Common Gotchas

- Video player requires SSR disabled (dynamic import with `ssr: false`)
- Always use `@/` import alias, not relative paths
- Client components need `"use client"` directive
- Settings can have legacy fields - use `getPortalConfig()` for normalization
- API routes return SSE streams for AI features

## Communication Style

- **PR Descriptions**: Concise, what not how, no emojis
- **Commits**: Focus on the change itself
- **Style**: Direct and technical (Guillermo Rauch, shadcn patterns)
