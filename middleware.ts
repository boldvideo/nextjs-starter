import { NextResponse } from "next/server";

const unauthorizedPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>401 Unauthorized</title>
    <style>
      :root {
        color-scheme: light;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      body {
        align-items: center;
        background: #f7f7f5;
        color: #171717;
        display: flex;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
      }

      main {
        margin: 0 auto;
        max-width: 520px;
      }

      p {
        color: #525252;
        font-size: 16px;
        line-height: 1.6;
        margin: 12px 0 0;
      }

      .status {
        color: #737373;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        font-size: clamp(32px, 7vw, 56px);
        letter-spacing: 0;
        line-height: 1;
        margin: 14px 0 0;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="status">401 Unauthorized</div>
      <h1>Access restricted</h1>
      <p>This content is private and is not available for public access.</p>
    </main>
  </body>
</html>`;

export default function middleware() {
  return new NextResponse(unauthorizedPage, {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export const config = {
  // Matcher configuration - protect all routes except:
  // - auth API routes
  // - static files
  // - auth routes
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
