"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createClient } from "@boldvideo/bold-js";

type BoldClient = ReturnType<typeof createClient>;

const BoldContext = createContext<BoldClient | null>(null);

interface BoldProviderProps {
  token: string;
  baseURL?: string;
  children: ReactNode;
}

/**
 * Provides the Bold client to client components via React Context.
 *
 * Usage:
 * ```tsx
 * // In server layout
 * <BoldProvider token={context.tenantToken}>
 *   {children}
 * </BoldProvider>
 *
 * // In client components
 * const bold = useBold();
 * bold.trackEvent(video, event);
 * ```
 */
export function BoldProvider({ token, baseURL, children }: BoldProviderProps) {
  const client = useMemo(() => {
    return createClient(token, { baseURL, debug: false });
  }, [token, baseURL]);

  return <BoldContext.Provider value={client}>{children}</BoldContext.Provider>;
}

/**
 * Hook to access the Bold client in client components.
 *
 * Must be used within a BoldProvider.
 *
 * @throws Error if used outside of BoldProvider
 */
export function useBold(): BoldClient {
  const client = useContext(BoldContext);
  if (!client) {
    throw new Error(
      "useBold must be used within a BoldProvider. " +
        "Ensure your component is wrapped in <BoldProvider token={...}>."
    );
  }
  return client;
}

/**
 * Hook to optionally access the Bold client.
 * Returns null if not within a BoldProvider.
 */
export function useBoldOptional(): BoldClient | null {
  return useContext(BoldContext);
}
