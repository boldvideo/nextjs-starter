# BOLD Next.js Tailwind Starter Commands & Guidelines

## Build & Development

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun start` - Start production server
- `bun lint` - Run ESLint

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

## Communication & Documentation

- **PR Descriptions**: Write objectively and concisely about WHAT the change is, not HOW or WHY we got there. No emojis.
- **Commit Messages**: Focus on the change itself, not the decision process or context
- **Style Reference**: Follow patterns from Guillermo Rauch, Ryan Florence, shadcn, Lee Robinson - direct and technical
