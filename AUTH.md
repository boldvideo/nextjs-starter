# Authentication Guide

This guide explains the authentication systems available in the Bold Video Next.js Starter Kit.

## Overview

The starter kit supports **two independent authentication systems** that can be used separately or together:

| System | Purpose | Use Case |
|--------|---------|----------|
| **Portal Password Protection** | Shared password for viewer access | Protect entire portal from public access |
| **OAuth (NextAuth)** | Individual user accounts via SSO | Team/admin access with user identity |

```
┌─────────────────────────────────────────────────────────────────┐
│                     Authentication Flow                         │
├─────────────────────────────────────────────────────────────────┤
│  Request arrives                                                │
│  ├── 1. Portal Auth check (if settings.portal.auth.required)   │
│  │   └── No valid session? → /login (password entry)           │
│  ├── 2. NextAuth check (if AUTH_ENABLED=true)                  │
│  │   └── No valid session? → /auth/signin (OAuth)              │
│  └── Both pass? → Access granted                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Portal Password Protection

Simple shared-password protection for portals. When enabled, all visitors must enter the portal password to access content.

### How It Works

1. Portal has `settings.portal.auth.required: true` (configured in Bold dashboard)
2. Visitor arrives → redirected to `/login`
3. Visitor enters shared password → validated against Bold API
4. Valid password → JWT session cookie set (24h expiry)
5. Subsequent requests → JWT verified locally (no API calls)

### Configuration

**Hosted Mode** (multi-tenant with `BOLD_PLATFORM_KEY`):
- Password protection is controlled via Bold dashboard
- Set `settings.portal.auth.required: true` for the portal
- No additional env vars needed (uses `AUTH_SECRET` for JWT signing)

**Standalone Mode** (single tenant with `BOLD_API_KEY`):
```env
# Enable password protection
PORTAL_AUTH_REQUIRED=true

# Required: Secret for signing JWT tokens
# Falls back to AUTH_SECRET if not set
AUTH_SECRET=your-secret-here
```

### Files

| File | Purpose |
|------|---------|
| `lib/portal-auth.ts` | JWT utilities (Node.js runtime) |
| `lib/portal-auth-edge.ts` | JWT utilities (Edge runtime) |
| `app/api/portal-auth/route.ts` | Login endpoint |
| `app/api/portal-auth/logout/route.ts` | Logout endpoint |
| `app/login/page.tsx` | Login page |
| `components/portal-auth/login-form.tsx` | Login form |

### Deep Links

Deep links are preserved through the login flow:
- Visit `/v/abc123` → Redirect to `/login?redirect=/v/abc123` → Login → Land on `/v/abc123`

---

## OAuth Authentication (NextAuth)

Individual user authentication via Google OAuth or WorkOS SSO. Use this for team/admin access where you need to know who is accessing the portal.

### Supported Providers

- **Google OAuth**: For individual Google accounts
- **WorkOS SSO**: For enterprise SSO (SAML, OIDC, etc.)
- **Dual Mode**: Both providers simultaneously

### Configuration

#### Core Settings

```env
# Enable OAuth authentication
AUTH_ENABLED=true
AUTH_PROVIDER=workos  # Options: google, workos

# Required: Generate with `npx auth secret`
AUTH_SECRET=your-secret-here

# Required: Your application URL
AUTH_URL=https://your-domain.com
```

#### Google OAuth

1. Create credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Add redirect URI: `https://your-domain.com/api/auth/callback/google`

```env
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

#### WorkOS SSO

1. Create connection in [WorkOS Dashboard](https://workos.com/)
2. Add redirect URI: `https://your-domain.com/api/auth/callback/workos`

```env
AUTH_WORKOS_ID=client_xxxxxxxxxxxxx
AUTH_WORKOS_SECRET=sk_xxxxxxxxxxxxx
AUTH_WORKOS_CONNECTION=conn_xxxxxxxxxxxxx
AUTH_WORKOS_ORG=org_xxxxxxxxxxxxx  # Optional
```

#### Domain Restrictions

```env
# Comma-separated list of allowed email domains
NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS=company.com,example.org
```

Note: Bold team domains (@boldvideo.com, @boldvideo.io, @bold.video) are always allowed when Google is configured.

### Bold Team Access

When both Google and WorkOS are configured, the sign-in page shows only WorkOS by default. Bold team members can access Google sign-in via:

- `/auth/signin?team=true`
- `/auth/signin?bold=true`

### Files

| File | Purpose |
|------|---------|
| `auth.ts` | Auth.js configuration |
| `config/auth.ts` | Auth utilities and domain checks |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js route handlers |
| `app/auth/signin/page.tsx` | Sign-in page |
| `components/auth/sign-in.tsx` | Sign-in form |
| `components/auth/user-menu.tsx` | User menu with sign-out |

---

## Using Both Systems Together

You can enable both portal password protection AND OAuth authentication:

1. **First layer**: Portal password (shared access control)
2. **Second layer**: OAuth (individual user identity)

This is useful when you want to:
- Gate the entire portal behind a shared password
- Also track which team members are accessing content

```env
# Portal password (handled by settings.portal.auth.required in hosted mode)
AUTH_SECRET=your-secret-here

# OAuth
AUTH_ENABLED=true
AUTH_PROVIDER=google
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

---

## Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `AUTH_SECRET` | Yes* | JWT signing for both systems |
| `PORTAL_AUTH_REQUIRED` | Standalone only | Enable portal password |
| `AUTH_ENABLED` | For OAuth | Enable OAuth authentication |
| `AUTH_PROVIDER` | For OAuth | `google`, `workos`, or both |
| `AUTH_URL` | For OAuth | Application URL for callbacks |
| `AUTH_GOOGLE_ID` | For Google | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | For Google | Google OAuth client secret |
| `AUTH_WORKOS_ID` | For WorkOS | WorkOS client ID |
| `AUTH_WORKOS_SECRET` | For WorkOS | WorkOS client secret |
| `AUTH_WORKOS_CONNECTION` | For WorkOS | WorkOS connection ID |

*Required if using either authentication system.

---

## Troubleshooting

### Portal Password Issues

**"PORTAL_AUTH_SECRET or AUTH_SECRET must be set"**
- Set `AUTH_SECRET` in your environment

**Password not working**
- Verify the password is set correctly in Bold dashboard
- Check that the Bold API endpoint is reachable

**Session not persisting**
- Check that cookies are enabled
- Verify `AUTH_SECRET` is the same across all instances

### OAuth Issues

**WorkOS "Something went wrong"**
- Verify `AUTH_WORKOS_CONNECTION` matches WorkOS dashboard
- Check redirect URIs in WorkOS settings

**Google OAuth errors**
- Verify redirect URIs match exactly
- Ensure Google+ API is enabled

**Sign-out not working**
- Use client-side `signOut` from `next-auth/react`
- Check for 404 errors on `/api/auth/*` routes
