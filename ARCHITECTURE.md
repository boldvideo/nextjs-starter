# Architecture Guide

## Overview

This Next.js starter implements a video portal with dual AI chat systems serving different use cases.

## Two-Chat-System Architecture

This is an intentional design decision, not an oversight.

### System 1: Video Q&A (`components/video/chat/`)
- **Route**: `/pl/[id]/v/[videoId]`
- **Purpose**: Video-specific questions with timestamp integration
- **Location**: Right sidebar (companion panel)
- **Context**: Video ID, playback ID
- **Features**:
  - Timestamp seeking in video player
  - Compact sidebar-optimized UI
  - Video-aware responses
- **Use Case**: "What does the speaker say at 2:35?"

### System 2: Coach Chat (`components/coach/`)
- **Route**: `/coach`
- **Purpose**: General conversational AI assistant
- **Location**: Dedicated full-screen page
- **Context**: Conversational continuity, no video
- **Features**:
  - Clarification loop (ask → clarify → answer)
  - Full conversation history
  - Large input area for detailed questions
- **Use Case**: "Help me understand this concept"

## Component Organization

### Route-Aligned Structure

Components are organized by route for easy discoverability:

- `/pl/[id]/v/[videoId]` → `components/video/`
- `/coach` → `components/coach/`

Import paths provide context:
```typescript
// Video features
import { Chat } from '@/components/video/chat'

// Coach features
import { CoachInterface } from '@/components/coach'
```

### Directory Structure

```
components/
├── ui/                   # Generic reusable UI
│   └── sidebar/          # Base sidebar system
├── video/               # Video route features
│   ├── chat/            # Video Q&A
│   ├── companion/       # Right sidebar
│   ├── navigation/      # Left sidebar (playlist)
│   └── detail/          # Video page layout
├── coach/               # Coach route features
├── layout/              # Layout wrappers
├── providers/           # Context providers
└── home/                # Homepage components
```

## Provider Hierarchy

Providers wrap the app in this order:

```
SessionProvider          # Auth session
└── ThemeProvider        # Dark/light mode
    └── SettingsProvider # User preferences
        └── ProgressProvider # Video progress tracking
            └── SidebarProvider # Sidebar state
                └── [App Content]
```

All providers use React Context for state management.

### SidebarProvider

Manages state for both left and right sidebars:

- **Left sidebar**: Playlist/chapter navigation
- **Right sidebar**: Video Q&A and chapters
- **Persistence**: sessionStorage (`"bold-sidebar-state-v1"`)
- **CSS Variables**: `--sidebar-left-width`, `--sidebar-right-width`
- **Mobile**: Exclusive mode (only one sidebar open at a time)

## Dual Sidebar System

### Left Sidebar (Navigation)
- Playlist navigation
- Chapter listing
- Toggle mode (full open/collapsed)
- Persists across routes

### Right Sidebar (Resources)
- Tabs: Chat (Video Q&A) and Chapters
- Collapse mode (visible/hidden)
- Video-specific content
- Resets per video

### Mobile Behavior

On mobile (`< 768px`):
- Only one sidebar can be open at a time
- Opening one automatically closes the other
- Both use slide-in/out animations

## State Management

### Context Pattern

All feature state uses React Context:
- `SidebarProvider` - Sidebar state
- `PlaylistProvider` - Playlist data
- `ProgressProvider` - Video progress
- `SettingsProvider` - User preferences

### SessionStorage

State that persists across page reloads:
- Sidebar open/collapsed state
- Active tab selection
- User preferences

## Layout System

### CSS Variables

Dynamic layout uses CSS custom properties:

```css
--sidebar-left-width: 280px    /* Playlist sidebar */
--sidebar-right-width: 400px   /* Companion sidebar */
--sidebar-left-visible: 1      /* Opacity toggle */
--sidebar-right-visible: 1     /* Opacity toggle */
```
