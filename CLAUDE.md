# BOLD Next.js Video Portal

Video portal starter kit for the Bold Video platform. Next.js 16, React 19, Tailwind CSS v4.

## Commands

```bash
bun dev          # Development server
bun run build    # Production build
bun start        # Start production
bun lint         # ESLint
```

## Quick Reference

| What | Where |
|------|-------|
| Routes | `app/(default)/` |
| Components | `components/` (route-aligned) |
| Types | `types/bold-extensions.ts` |
| Config | `lib/portal-config.ts` |
| Hooks | `hooks/` |
| API | `app/api/` |

## Key Patterns

**Server data fetching:**
```typescript
import { bold } from "@/client";
const { data } = await bold.videos.get(id);
```

**Portal config:**
```typescript
import { getPortalConfig } from "@/lib/portal-config";
const config = getPortalConfig(settings);
```

**Conditional classes:**
```typescript
import { cn } from "@/lib/utils";
<div className={cn("base", condition && "extra")} />
```

## Code Style

- **Imports**: External, Next.js, local (`@/`)
- **TypeScript**: Explicit types
- **Naming**: PascalCase (components), camelCase (functions)
- **Client components**: `"use client"` directive
- **Formatting**: 2-space indent, semicolons, arrow functions
- **Styling**: Tailwind CSS

## Gotchas

- Video player: dynamic import with `ssr: false`
- Use `@/` imports, not relative
- Use `getPortalConfig()` for settings normalization
- AI endpoints use SSE streaming

## Docs

- `AGENTS.md` - Full AI agent guide with codebase map
- `ARCHITECTURE.md` - System architecture
- `STATE_MANAGEMENT.md` - State patterns
- `AUTH.md` - Auth setup
- `thoughts/` - Research/planning

## Communication

- **PRs/Commits**: Concise, what not how, no emojis
- **Style**: Direct, technical
