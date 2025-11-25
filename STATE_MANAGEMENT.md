# State Management Architecture

This document outlines the state management strategy for the BOLD Next.js Starter Kit. We prioritize simplicity, performance, and modern React patterns (React Server Components, Server Actions, URL state) over heavy client-side libraries.

## Core Philosophy

1.  **Lean & Native First**: We start with native React primitives (`useState`, `useReducer`, `Context`). We avoid adding external state libraries until strictly necessary.
2.  **URL as Source of Truth**: For any state that *should* be shareable (filters, pagination, active tabs, search queries), prefer the URL (`searchParams`) over client-side store.
3.  **Server State**: Use `SWR` or React Server Components for data fetching. Do not duplicate server data into a global client store unless you need optimistic UI updates or complex offline support.

## Recommended Patterns

### 1. Global Configuration & Domain State -> React Context

For read-mostly configuration (Theme, Settings) or specific domain contexts (Progress, Playlist) that are needed across the app, use **React Context**.

**Why?**
- Built-in to React.
- Zero extra bundle size.
- Perfect for "broadcast" style data that doesn't change rapidly.

**Example:** `SettingsProvider`, `ThemeProvider`.

### 2. UI Toggles & Ephemeral State -> Local State or Composition

For UI state like "is sidebar open", "is modal open", prefer:
-   **Local State**: `useState` in the nearest common parent (e.g., a Layout).
-   **Composition**: Pass state down via props or slots.

If you have a UI toggle that needs to be accessed from deeply nested components *and* it's not suitable for the URL, create a focused Context (e.g., `SidebarProvider`).

### 3. Shareable State -> URL (Nuqs)

If a piece of state should persist on refresh or be shareable via link, do not use `useState` or a store. Use the URL.

**Recommendation:** If native `searchParams` handling gets complex, we recommend adopting [nuqs](https://nuqs.47ng.com/) (Next.js URL Query Strings).

**Use cases:**
- Search bars
- Filters and sorting
- Pagination
- Active tabs (if they should be linkable)

### 4. Complex Client State -> Zustand

If your app grows to have complex, cross-cutting client-side interactions that make Context cumbersome (e.g., a complex video editor, multi-step wizard, or highly interactive dashboard with many dependent UI elements), we recommend **[Zustand](https://github.com/pmndrs/zustand)**.

**Why Zustand?**
-   **Tiny**: ~1KB.
-   **Unopinionated**: No boilerplate, just hooks.
-   **Performance**: Components only re-render when their selected slice changes (solves the Context re-render issue).
-   **RSC Friendly**: Easy to instantiate in Client Components without wrapping the whole app in providers.

**When to switch to Zustand:**
-   You have 3+ global UI concerns (sidebar, toasts, modals, drawers) interacting.
-   You are passing state through 4+ layers of components.
-   You notice performance issues with a large Context provider.

## Current Architecture (Starter Kit)

As of now, the starter kit uses **React Context** for all global state needs. We believe this keeps the codebase accessible and dependency-light.

-   `SettingsProvider`: App-wide configuration.
-   `ProgressProvider`: Video progress tracking (async + sync).
-   `ThemeProvider`: Light/Dark mode.
