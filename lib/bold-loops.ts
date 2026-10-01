import "server-only";

/**
 * Bold's own list (Loops), fed by the "send us your channel" form on
 * /built-by-bold. Separate from FounderWell's coin: different form,
 * different consent, never the same email field.
 *
 * Contact: upserted with source "gtm-game" and a channelUrl property.
 * Event: "channel_submitted" with the channel, so a Loops workflow can
 * notify Bold and reply to the person. Needs LOOPS_API_KEY.
 */

import { BOLD_CONSENT_TEXT } from "@/lib/bold-lead";

const API = "https://app.loops.so/api/v1";

function loops(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.LOOPS_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
  });
}

// The custom property has to exist before contacts can carry it
let ready: Promise<unknown> | null = null;

export function loopsEnabled(): boolean {
  return Boolean(process.env.LOOPS_API_KEY);
}

export async function submitChannel(input: { email: string; channelUrl: string; consentedAt: string }) {
  ready ??= loops("/contacts/properties", {
    method: "POST",
    body: JSON.stringify({ name: "channelUrl", type: "string" }),
  }).catch(() => null);
  await ready;

  // Update creates the contact when it doesn't exist yet
  const contact = await loops("/contacts/update", {
    method: "PUT",
    body: JSON.stringify({
      email: input.email,
      source: "gtm-game",
      subscribed: true,
      channelUrl: input.channelUrl,
    }),
  });
  if (!contact.ok) throw new Error(`Loops contact ${contact.status}: ${(await contact.text()).slice(0, 300)}`);

  const event = await loops("/events/send", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      eventName: "channel_submitted",
      eventProperties: {
        channelUrl: input.channelUrl,
        consentedAt: input.consentedAt,
        consent: BOLD_CONSENT_TEXT,
        source: "play.founderwell.com",
      },
    }),
  });
  if (!event.ok) console.error(`[bold] loops event ${event.status}: ${(await event.text()).slice(0, 300)}`);
}
