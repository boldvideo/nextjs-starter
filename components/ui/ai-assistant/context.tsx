"use client";

import React, { createContext, useContext } from "react";

// Define the shape of the context value
interface AIAssistantContextValue {
  onTimeClick: (time: number) => void;
}

// Create the context with a default value (or null)
const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

// Create a provider component
interface AIAssistantProviderProps {
  children: React.ReactNode;
  onTimeClick: (time: number) => void;
}

export const AIAssistantProvider = ({
  children,
  onTimeClick,
}: AIAssistantProviderProps) => {
  // Memoize the value if the onTimeClick function could change referentially,
  // though in our case it comes from a useCallback in VideoDetail, so it should be stable.
  const value = { onTimeClick };

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
};

// Create a custom hook to consume the context
export const useAIAssistantContext = () => {
  const context = useContext(AIAssistantContext);
  if (!context) {
    // Provide a default no-op function or throw an error if the context is mandatory
    // console.warn('useAIAssistantContext must be used within an AIAssistantProvider');
    return {
      onTimeClick: (time: number) => {
        console.warn(
          "AIAssistantContext not found, onTimeClick did nothing for time:",
          time
        );
      },
    };
    // Or: throw new Error('useAIAssistantContext must be used within an AIAssistantProvider');
  }
  return context;
};
