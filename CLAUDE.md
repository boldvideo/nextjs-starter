# BOLD Next.js Tailwind Starter Commands & Guidelines

## Build & Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

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

