import { useState, useCallback } from "react";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIResponseHandler = (
  question: string,
  conversation: Message[],
  appendChunk?: (chunk: string) => void
) => Promise<void>;

interface UseAIAssistantProps {
  onAskQuestion: AIResponseHandler;
}

export function useAIAssistant({ onAskQuestion }: UseAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const appendChunk = useCallback((chunk: string) => {
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
  }, []);

  const handleError = useCallback((error: Error) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === "assistant" && lastMessage.content === "") {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Error: ${error.message}. Please try again.`,
        };
        return updated;
      }
      return prev;
    });
    setIsPending(false);
  }, []);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isPending) return;

    const question = inputValue.trim();
    setInputValue("");
    setIsPending(true);

    // Add user message
    const userMessage: Message = { role: "user", content: question };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Create temporary message for response
    const tempMessage: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      await onAskQuestion(question, newMessages, appendChunk);
    } catch (error) {
      handleError(error as Error);
    } finally {
      setIsPending(false);
    }
  };

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    messages,
    inputValue,
    setInputValue,
    handleSubmit,
    isPending,
    isOpen,
    toggleOpen,
  };
}
