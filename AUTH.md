# Authentication Setup Guide

This guide explains how to configure authentication for the Bold Video Next.js Starter Kit using Auth.js with Google OAuth and WorkOS SSO.

## Overview

The authentication system supports:
- **Dual-provider mode**: Both Google and WorkOS can be used simultaneously
- **Bold team access**: Team members from @boldvideo.com, @boldvideo.io, and @bold.video domains automatically have access via Google OAuth
- **Customer organization SSO**: Customers can use their own SSO via WorkOS
- **Domain restrictions**: Optional email domain allowlisting

## Environment Variables

Add these to your `.env.local` file:

### Core Configuration

```env
# Enable authentication
AUTH_ENABLED=true
AUTH_PROVIDER=workos  # Options: google, workos

# Required: Generate with `npx auth secret`
AUTH_SECRET=your-secret-here

# Required: Set your application URL
AUTH_URL=https://your-domain.com  # or https://your-subdomain.ngrok.io for development
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`

```env
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

### WorkOS SSO Setup

1. Sign up at [WorkOS](https://workos.com/)
2. Create an organization in your WorkOS dashboard
3. Navigate to SSO section and create a connection
4. Copy the Connection ID from the dashboard
5. Add redirect URIs in WorkOS:
   - Development: `http://localhost:3000/api/auth/callback/workos`
   - Production: `https://your-domain.com/api/auth/callback/workos`

```env
AUTH_WORKOS_ID=client_xxxxxxxxxxxxx
AUTH_WORKOS_SECRET=sk_test_xxxxxxxxxxxxx
AUTH_WORKOS_CONNECTION=conn_xxxxxxxxxxxxx  # Required: From WorkOS dashboard
AUTH_WORKOS_ORG=org_xxxxxxxxxxxxx  # Optional: For org-specific sign-in
```

### Optional: Domain Restrictions

```env
# Comma-separated list of allowed email domains
# Note: Bold team domains are always allowed when Google is configured
NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS=company.com,example.org
```

## Dual-Provider Configuration (Recommended)

For Bold-hosted customer portals, configure both providers to ensure both your team and customers can access:

```env
# Core
AUTH_ENABLED=true
AUTH_PROVIDER=workos
AUTH_SECRET=your-secret
AUTH_URL=https://your-app.ngrok.io

# Google for Bold team
AUTH_GOOGLE_ID=your-google-id
AUTH_GOOGLE_SECRET=your-google-secret

# WorkOS for customer
AUTH_WORKOS_ID=your-workos-id
AUTH_WORKOS_SECRET=your-workos-secret
AUTH_WORKOS_CONNECTION=your-connection-id

# Optional domain restrictions for customers
NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS=customer-domain.com
```

## How It Works

1. **Authentication Check**: The system checks if `AUTH_ENABLED=true`
2. **Provider Loading**: Based on configuration, it loads Google and/or WorkOS providers
3. **Sign-in Page**: When both providers are configured, users see:
   - "Sign in with Organization SSO" (WorkOS)
   - "Sign in with Google (Bold Team)"
4. **Access Control**:
   - Bold team emails (@boldvideo.com, @boldvideo.io, @bold.video) always allowed via Google
   - Customer emails validated against `NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS` if set
   - All validation happens server-side for security

## Testing

1. Set up your `.env.local` with the configuration above
2. Run `npm run dev`
3. Navigate to your app
4. You should be redirected to `/auth/signin`
5. Sign in with WorkOS SSO (customers only see this option)

### Bold Team Access

When both Google and WorkOS are configured, the sign-in page shows only the WorkOS button by default. Bold team members can access Google sign-in using query parameters:

- `/auth/signin?team=true` - Shows both WorkOS and Google options
- `/auth/signin?team=1` - Same as above
- `/auth/signin?bold=true` - Alternative parameter
- `/auth/signin?bold=1` - Alternative parameter

This keeps the customer experience clean while providing backdoor access for the Bold team.

### Testing with WorkOS Test Users

WorkOS provides test users for development:
1. In your WorkOS dashboard, navigate to your connection
2. Use the "Test Connection" feature to generate test users
3. Sign in with the test credentials provided

## Troubleshooting

### WorkOS "Something went wrong" error
- Ensure `AUTH_WORKOS_CONNECTION` is set correctly
- Verify the connection ID matches what's in your WorkOS dashboard
- Check that redirect URIs are configured in WorkOS

### Google OAuth errors
- Verify redirect URIs match exactly (including protocol and path)
- Ensure Google+ API is enabled in Google Cloud Console
- Check that client ID and secret are correct

### Sign-out not working
- The auth routes are at `/api/auth/*`
- Ensure you're using the client-side `signOut` from `next-auth/react`
- Check browser console for 404 errors on `/api/auth/csrf` or `/api/auth/signout`

### User menu not appearing
- Ensure authentication is working (check for session)
- The user menu only appears when there's an active session
- Check that the session is being passed to the Header component

## File Structure

- `/auth.ts` - Main Auth.js configuration
- `/config/auth.ts` - Authentication utilities and domain checks
- `/app/api/auth/[...nextauth]/route.ts` - Auth.js route handlers
- `/app/auth/signin/page.tsx` - Custom sign-in page
- `/components/auth/sign-in.tsx` - Sign-in form component
- `/components/auth/user-menu.tsx` - User menu with sign-out
- `/middleware.ts` - Route protection

## Important Notes

- **Callback URLs**: Must match exactly in your OAuth provider settings
  - Google: `https://your-domain/api/auth/callback/google`
  - WorkOS: `https://your-domain/api/auth/callback/workos`
- **WorkOS Connection**: The `AUTH_WORKOS_CONNECTION` is required and must match your WorkOS dashboard
- **Bold Team Access**: Hardcoded domains (@boldvideo.com, @boldvideo.io, @bold.video) always have access via Google
- **Security**: All email validation happens server-side in the `signIn` callback