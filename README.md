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

`app/layout.tsx`
`components/mobile-menu.tsx`

You can modify these files to adjust the styling or layout of the navigation according to your preferences.

### Adding Videos and Playlists
To add videos, go to the "Videos" page by following this link: https://app.boldvideo.io/videos and click the "New Video" Button. Only videos with the "Status" set to "public" will appear on the index page of the Starter Kit.

<img src="https://github.com/boldvideo/nextjs-starter/blob/main/.github/media/screenshot-videos.png?raw=true" width="50%" />

To add playlists, go to the "Playlists" page by following this link: https://app.boldvideo.io/playlists.

<img src="https://github.com/boldvideo/nextjs-starter/blob/main/.github/media/screenshot-playlists.png?raw=true" width="50%" />

To feature playlists on the index page, add them to "Featured Playlists" under Settings -> Featured Playlists by following this link: https://app.boldvideo.io/settings/featured-playlists.


### Color Customization
To customize the colors of your application, you can modify the `tailwind.config.js` file located in the root of the project. The file contains two custom colors, background and primary, which you can adjust according to your needs or brand guidelines.

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: "#ffffff",
        black: "#000000",
        background: "#111827",
        primary: "#FF206E",
      },
    },
  },
  plugins: [],
};
```

After updating the colors, your application will automatically reflect the new color scheme.

## Deployment
To deploy your app on [Vercel](https://vercel.com), follow these steps:

1. Sign up for a free account on [Vercel](https://vercel.com).
2. Install the Vercel CLI by running `npm i -g vercel`.
3. Run `vercel login` and enter your Vercel account credentials.
4. Run `vercel` to deploy your app.

Your app will be deployed to a unique URL, and you can manage it through the Vercel dashboard.

## Feedback and Issues
If you encounter any issues or have feedback, please [create an issue](https://github.com/boldvideo/nextjs-starter/issues) on GitHub.

