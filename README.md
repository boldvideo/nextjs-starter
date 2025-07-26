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

- **Dual Player Support**: Choose between Mux Player and Vidstack for video playback
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

### Switching Video Players

The starter kit supports two video player implementations:

1. **Mux Player**: Based on Mux's official player component
2. **Vidstack Player**: Based on the Vidstack player library

To switch between them, edit the default export in `components/players/index.ts`:

```typescript
// Default player export - change this line to switch the default player
export { MuxPlayerComponent as Player } from "./player-mux";
// Or use Vidstack instead:
// export { VidstackPlayer as Player } from "./player-vidstack";
```

You can also import specific players directly in your components:

```typescript
import { MuxPlayer } from "@/components/players";
// or
import { VidstackPlayer } from "@/components/players";
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
- **Multiple providers**: Support for Google OAuth and WorkOS
- **Domain restrictions**: Limit access to specific email domains
- **Session management**: Secure JWT-based sessions
- **User menu**: Profile dropdown with sign-out functionality

#### Setting up Authentication

1. **Enable authentication** by setting environment variables in your `.env.local`:

```env
# Enable authentication
NEXT_PUBLIC_AUTH_ENABLED=true

# Choose your provider (google or workos)
NEXT_PUBLIC_AUTH_PROVIDER=google

# Generate auth secret with: npx auth secret
AUTH_SECRET=your-generated-secret
```

2. **Configure your OAuth provider**:

For Google OAuth:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

For WorkOS:
```env
WORKOS_CLIENT_ID=your-workos-client-id
WORKOS_API_KEY=your-workos-api-key
```

3. **Optional: Restrict to specific domains**:
```env
# Comma-separated list of allowed email domains
NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS=company.com,example.org
```

#### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)

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

