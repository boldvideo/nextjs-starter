# Design context

Use the existing Tailwind theme tokens: background, foreground, muted, muted-foreground, border, primary, primary-foreground, and destructive. Tenant themes support light and dark appearances; new controls inherit them.

Video chat appears in a desktop sidebar at the lg breakpoint and a compact mobile Chat panel. Keep the current message shapes and typography. Voice adds a microphone beside Send and replaces the composer with an inline status bar while connected. Preserve the typed draft.

Use a restrained accent for live audio, a neutral mute control, and a destructive end-call control. Controls have at least 44px targets, explicit accessible names, and visible focus rings. Audio amplitude may scale a small orb using transforms; reduced motion disables that movement. Status text should remain stable between speech fragments.
