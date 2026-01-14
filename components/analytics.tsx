import Script from "next/script";
import type { AnalyticsProvider } from "@boldvideo/bold-js";

interface AnalyticsConfig {
  provider: AnalyticsProvider;
  id: string;
}

interface AnalyticsProps {
  config?: AnalyticsConfig | null;
}

export function Analytics({ config }: AnalyticsProps) {
  if (!config?.provider || !config?.id) return null;

  const { provider, id } = config;

  switch (provider) {
    case "plausible":
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
