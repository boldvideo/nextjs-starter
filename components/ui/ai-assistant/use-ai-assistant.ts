import { useState, useCallback } from "react";
import { useAIAssistantContext } from "./context"; // Import context hook
import type { Message } from "./types"; // Import Message type from types.ts

export type { Message }; // Re-export Message type

type AIResponseHandler = (
  question: string,
  conversation: Message[],
  appendChunk?: (chunk: string) => void
) => Promise<void>;

interface UseAIAssistantProps {
  onAskQuestion: AIResponseHandler;
}

export function useAIAssistant({ onAskQuestion }: UseAIAssistantProps) {
  // Consume state from context
  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isPending,
    setIsPending,
  } = useAIAssistantContext();

  // Keep local state only for UI concerns specific to this hook/component instance
  // For now, isOpen seems specific to the floating behavior toggle
  const [isOpen, setIsOpen] = useState(false);

  const appendChunk = useCallback(
    (chunk: string) => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (!lastMessage || lastMessage.role !== "assistant") return prev;

        const previousMessages = prev.slice(0, -1);
        return [
          ...previousMessages,
          {
            role: "assistant",
            content: lastMessage.content + chunk,
          },
        ];
      });
    },
    [setMessages] // Depend on setter from context
  );

  const handleError = useCallback(
    (error: Error) => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        // Update the last assistant message if it was empty (placeholder)
        if (lastMessage?.role === "assistant" && lastMessage.content === "") {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${error.message}. Please try again.`,
          };
          return updated;
        }
        // If there wasn't an empty placeholder, maybe append a new error message?
        // For now, we only update the placeholder. If the request failed later,
        // we might want to add a distinct error message.
        // return [...prev, { role: "assistant", content: `Error: ${error.message}` }];
        return prev;
      });
      setIsPending(false); // Use setter from context
    },
    [setMessages, setIsPending] // Depend on setters from context
  );

  const handleSubmit = async (overrideQuestion?: string) => {
    const question = overrideQuestion || inputValue.trim();
    if (!question || isPending) return;

    if (!overrideQuestion) {
      setInputValue(""); // Only clear input if not an override
    }
    setIsPending(true); // Use setter from context

    // Add user message
    const userMessage: Message = { role: "user", content: question };
    // Use functional update with setter from context
    setMessages((prev) => [...prev, userMessage]);

    // Create temporary message for response & add it
    const tempMessage: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, tempMessage]);

    // Get current messages *after* adding user message for conversation history
    // Note: Accessing state directly after setting it might not give the updated value
    // immediately. Passing the history directly is safer.
    const currentMessages = [...messages, userMessage]; // Pass the correct history

    try {
      await onAskQuestion(question, currentMessages, appendChunk);
    } catch (error) {
      handleError(error as Error);
    } finally {
      setIsPending(false); // Use setter from context
    }
  };

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    messages, // From context
    inputValue, // From context
    setInputValue, // From context
    handleSubmit,
    isPending, // From context
    isOpen, // Local state
    toggleOpen, // Local state toggle
  };
}
