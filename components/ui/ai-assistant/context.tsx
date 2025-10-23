"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Message } from "./types"; // Import Message type from types.ts

// Define the shape of the context value
interface AIAssistantContextValue {
  onTimeClick: (time: number) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  isPending: boolean;
  setIsPending: React.Dispatch<React.SetStateAction<boolean>>;
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  resetConversation: () => void;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setInputValue("");
    setIsPending(false);
  }, []);

  // Memoize the value if the onTimeClick function could change referentially,
  // though in our case it comes from a useCallback in VideoDetail, so it should be stable.
  // Now includes the state and setters.
  const value = {
    onTimeClick,
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isPending,
    setIsPending,
    conversationId,
    setConversationId,
    resetConversation,
  };

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
    // Return default values matching the context shape to avoid runtime errors
    // if used outside the provider, although ideally it shouldn't happen.
    return {
      onTimeClick: (time: number) => {
        console.warn(
          "AIAssistantContext not found, onTimeClick did nothing for time:",
          time
        );
      },
      messages: [],
      setMessages: () =>
        console.warn("AIAssistantContext not found, setMessages did nothing."),
      inputValue: "",
      setInputValue: () =>
        console.warn(
          "AIAssistantContext not found, setInputValue did nothing."
        ),
      isPending: false,
      setIsPending: () =>
        console.warn("AIAssistantContext not found, setIsPending did nothing."),
      conversationId: null,
      setConversationId: () =>
        console.warn("AIAssistantContext not found, setConversationId did nothing."),
      resetConversation: () =>
        console.warn("AIAssistantContext not found, resetConversation did nothing."),
    } as AIAssistantContextValue; // Assert type for default return
    // Or: throw new Error('useAIAssistantContext must be used within an AIAssistantProvider');
  }
  return context;
};
