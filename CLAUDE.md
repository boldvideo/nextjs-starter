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

