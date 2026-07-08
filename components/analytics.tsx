import Script from "next/script";
import type { AnalyticsConfig } from "@/lib/portal-config";

interface AnalyticsProps {
  config?: AnalyticsConfig | null;
}

export function Analytics({ config }: AnalyticsProps) {
  if (!config?.provider || !config?.id) return null;

  const { provider, id } = config;

  switch (provider) {
    case "plausible":
      // New tracker: per-site script id ("pa-…") from the install wizard.
      // Feature toggles (outbound links etc.) are baked into the hosted
      // script, so the id is all we need. The queue stub makes load order
      // between the two tags irrelevant.
      if (id.startsWith("pa-")) {
        return (
          <>
            <Script
              src={`https://plausible.io/js/${id}.js`}
              strategy="afterInteractive"
            />
            <Script id="plausible-init" strategy="afterInteractive">
              {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init();`}
            </Script>
          </>
        );
      }
      // Legacy tracker: id is the site domain
      return (
        <Script
          src="https://plausible.io/js/script.js"
          data-domain={id}
          strategy="afterInteractive"
        />
      );

    case "ga4":
      return (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', ${JSON.stringify(id)});
            `}
          </Script>
        </>
      );

    case "fathom":
      return (
        <Script
          src="https://cdn.usefathom.com/script.js"
          data-site={id}
          strategy="afterInteractive"
        />
      );
  }

  return ((_: never) => null)(provider);
}
