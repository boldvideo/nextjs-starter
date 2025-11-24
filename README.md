<div align="center">
    <a href="https://bold.video?utm_source=github.com&utm_medium=readme&utm_campaign=bold-js" align="center">
		<img src="https://bold.video/bold-js-github-header.svg"  alt="Bold Logo">
	</a>
	<h1 align="center rainbow">nextjs-starter</h1>
    <p align="center">
        Starter Kit The easiest way to get started with <a href="http://bold.video?utm_source=github.com&utm_medium=readme&utm_campaign=bold-js" target="_blank">Bold Video</a>. Create a fully-featured Video Portal with a single command.
    </p>
</div>

<p align="center">
  <a href="https://twitter.com/intent/follow?screen_name=veryboldvideo">
    <img src="https://img.shields.io/badge/Follow-%40veryboldvideo-09b3af?style=appveyor&logo=twitter" alt="Follow @veryboldvideo" />
  </a>
  <a href="https://https://app.boldvideo.io/register?utm_source=github.com&utm_medium=readme&utm_campaign=bold-js">
    <img src="https://img.shields.io/badge/Try%20Bold-Free-09b3af?style=appveyor&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAmCAYAAADTGStiAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGFSURBVHgBxZg9SwNBEIZ34xUpVLCwEQQRtRARxV+g4M8QLO0sBPtgZS129gr+AbEWWyshOUSCkipBjB8cBHPrM4GVQ84qZuaFJTebj+feyczu3fmxEIIbXjnjjZEy7hm3feeunfdPf33B/xO4TBk/fMoZHXMCHU1wVBP3m8Cb2mDRI/AN4K9xouJ0NA9ovzih5Vj0jutZXHcl0HIsmkicW4uBJtiR2kUr8KQJGPVMwJ62sgJ//hxrtROQNsvnDO30JbGaY9xeROggVnLcY/FYAPwcJ7Qc7xahKmAAe33vz0vmRysK6rASQs2FUC3Oq1U1xZVSWVukvCWxWlXjbgnYFc6nVMEiXK+wQx0MjhX346gPWmtOe5MQjQPdsQBLylctUi3gholjnE6bgFHVCpxZgR+s/uOGVTvdWLTTCyvXurpj3J7IfbOqY0BpLrcx3mea22Id6LZAJdYA56T3COhy8dFE4kYkHN7xcgnwDGD79/sJH6i54SQ1ItfLXZx1GC2CehmsqG96m37o1gSKagAAAABJRU5ErkJggg==" alt="Try Bold Video" />
  </a>
</p>
Welcome to the Bold Video Starter Kit, the easiest way to get started with <a href="http://bold.video?utm_source=github.com&utm_medium=readme&utm_campaign=bold-js" target="_blank">Bold Video</a>. This project is based on Next.js and Tailwind CSS and offers a simple and effective way to create video applications using Bold.

## Features

- **Mux Player**: Production-ready playback powered by Mux's official React component
- **Dark Mode**: Built-in light/dark theme toggle with system preference detection
- **Search Functionality**: Fast, accessible search with keyboard shortcuts (⌘+K)
- **Authentication (Optional)**: OAuth support with Google/WorkOS, domain restrictions, and session management
- **Next.js 15**: Latest App Router architecture with React Server Components
- **Tailwind CSS v4**: Modern styling with OKLCH color space for better color perception
- **Responsive Design**: Optimized for all device sizes
- **Accessibility**: ARIA attributes, semantic HTML, and keyboard navigation
- **Error Handling**: Robust error handling for API requests

## Getting Started
There are two ways to get started: automatic mode and manual mode.

### Automatic Mode
Use one of the following commands:

```bash
npx create-bold-app
# or
yarn create bold-app
# or
pnpm create bold-app
```

You will be prompted to enter the app's name and the API key, which you can get from [https://app.boldvideo.io/settings](https://app.boldvideo.io/settings).

### Manual Mode
1. Clone this repository or use the GitHub template: https://github.com/boldvideo/nextjs-starter
2. Add the BOLD API key ([from https://app.boldvideo.io/settings](https://app.boldvideo.io/settings)) to `.env.local`.
3. Start the app with one of the following commands:

```bash
pnpm run dev
yarn run dev
npm run dev
```

After running the app, it will be available at localhost:3000.

## Component Organization

This starter uses route-aligned component organization:

- **Video features** (`/pl/[id]/v/[videoId]`): `components/video/`
  - Video Q&A chat with timestamp seeking
  - Dual sidebar system (playlist + chapters/chat)
  - Video player and controls

- **Coach features** (`/coach`): `components/coach/`
  - Full-screen conversational AI
  - Clarification loop
  - Citation support

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed information.

## Customization
### Logo
To change the logo placeholder, replace the image file in the `/public` folder. The logo is used in the files `app/layout.tsx` and `components/mobile-menu.tsx`.

### Main Navigation
To create new menu items, go to the [Main Menu Settings](https://app.boldvideo.io/settings/main-menu) Page in the Bold Admin Panel.

<img src="https://github.com/boldvideo/nextjs-starter/blob/main/.github/media/screenshot-settings-main-menu.png?raw=true" width="50%" />

If you want to change the appearance of the links, you can find the code for the navigation in the following files:

`app/(default)/layout.tsx`
`components/header.tsx`
`components/mobile-menu.tsx`

You can modify these files to adjust the styling or layout of the navigation according to your preferences.

### Video Player

The starter kit ships with the Mux Player integration enabled by default. You can
import it in your components like so:

```typescript
import { Player } from "@/components/players";
```

### Adding Videos and Playlists
To add videos, go to the "Videos" page by following this link: https://app.boldvideo.io/videos and click the "New Video" Button. Only videos with the "Status" set to "public" will appear on the index page of the Starter Kit.

<img src="https://github.com/boldvideo/nextjs-starter/blob/main/.github/media/screenshot-videos.png?raw=true" width="50%" />

To add playlists, go to the "Playlists" page by following this link: https://app.boldvideo.io/playlists.

<img src="https://github.com/boldvideo/nextjs-starter/blob/main/.github/media/screenshot-playlists.png?raw=true" width="50%" />

To feature playlists on the index page, add them to "Featured Playlists" under Settings -> Featured Playlists by following this link: https://app.boldvideo.io/settings/featured-playlists.


### Color Customization
The starter kit uses Tailwind v4 with OKLCH color space for modern, perceptually uniform colors. The color theme includes both light and dark modes.

To customize the colors, modify the CSS variables in `app/(default)/globals.css`:

```css
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.78 0.11 175);
  --primary-foreground: oklch(0.26 0.04 183);
  /* additional color variables... */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.78 0.11 175);
  /* additional dark mode color variables... */
}
```

The OKLCH format allows for more vibrant and accessible colors across different displays.
```

After updating the colors, your application will automatically reflect the new color scheme.

### Search Functionality

The starter kit includes a powerful search feature with:

- Search bar in the header with keyboard shortcut (⌘+K)
- Instant search results preview
- Dedicated search results page at `/s?q=query`
- Mobile-optimized search interface

The search implementation is in:
- `components/search-bar.tsx`: The search input component
- `components/search-preview.tsx`: Quick results dropdown
- `app/api/search/route.ts`: Backend API endpoint
- `app/(default)/s/page.tsx`: Full search results page

To customize the search experience, you can modify these files according to your preferences.

### Authentication (Optional)

The starter kit includes optional authentication support using [Auth.js](https://authjs.dev/), allowing you to protect your video portal with OAuth providers like Google or WorkOS.

#### Features
- **Disabled by default**: No authentication required out of the box
- **Multiple providers**: Support for Google OAuth and WorkOS (can be used simultaneously)
- **Dual-provider mode**: Automatically shows both Google and WorkOS sign-in when both are configured
- **Bold team access**: Bold Video team members (@boldvideo.com, @boldvideo.io, @bold.video) always have access via Google OAuth when configured
- **Domain restrictions**: Limit access to specific email domains
- **Session management**: Secure JWT-based sessions
- **User menu**: Profile dropdown with sign-out functionality

#### Setting up Authentication

1. **Enable authentication** by setting environment variables in your `.env.local`:

```env
# Enable authentication (use either AUTH_ENABLED or NEXT_PUBLIC_AUTH_ENABLED)
AUTH_ENABLED=true

# Choose your primary provider (google or workos)
# Note: When both providers are configured, both sign-in options will be available
AUTH_PROVIDER=workos

# Generate auth secret with: npx auth secret
AUTH_SECRET=your-generated-secret
```

2. **Configure your OAuth provider**:

For Google OAuth:
```env
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

For WorkOS:
```env
AUTH_WORKOS_ID=your-workos-client-id
AUTH_WORKOS_SECRET=your-workos-secret
AUTH_WORKOS_CONNECTION=your-connection-id  # Required: Get from WorkOS dashboard
AUTH_WORKOS_ORG=your-organization-id  # Optional: For org-specific sign-in
```

3. **Optional: Restrict to specific domains**:
```env
# Comma-separated list of allowed email domains
# Note: Bold team domains are always allowed when Google auth is configured
NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS=company.com,example.org
```

#### Dual Provider Setup (Recommended for Bold-hosted portals)

For portals hosted by Bold Video for customers, we recommend configuring both providers:

1. **Configure WorkOS** for your customer's organization SSO
2. **Configure Google OAuth** to allow Bold team access for support

When both are configured, the sign-in page will show:
- "Sign in with Organization SSO" button (WorkOS)
- "Sign in with Google (Bold Team)" button

This ensures both your customer and Bold support team can access the portal when needed.

#### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)

#### Setting up WorkOS
1. Sign up for [WorkOS](https://workos.com/) and create an organization
2. Navigate to the SSO section in your WorkOS dashboard
3. Create a new SSO connection (e.g., "OAuth" or "SAML")
4. Copy your Connection ID from the dashboard
5. Add redirect URIs in WorkOS dashboard:
   - `http://localhost:3000/api/auth/callback/workos` (development)
   - `https://your-domain.com/api/auth/callback/workos` (production)
6. Get your API keys from the WorkOS dashboard API Keys section

#### Authentication Files

The authentication implementation is in:
- `auth.ts`: Main Auth.js configuration
- `config/auth.ts`: Authentication utilities
- `components/auth/user-menu.tsx`: User dropdown menu
- `components/auth/sign-in.tsx`: Sign-in page component
- `middleware.ts`: Route protection logic

## Deployment
To deploy your app on [Vercel](https://vercel.com), follow these steps:

1. Sign up for a free account on [Vercel](https://vercel.com).
2. Install the Vercel CLI by running `npm i -g vercel`.
3. Run `vercel login` and enter your Vercel account credentials.
4. Run `vercel` to deploy your app.

Your app will be deployed to a unique URL, and you can manage it through the Vercel dashboard.

## Feedback and Issues
If you encounter any issues or have feedback, please [create an issue](https://github.com/boldvideo/nextjs-starter/issues) on GitHub.
