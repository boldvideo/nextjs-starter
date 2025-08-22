"use client";

import { useState, useCallback, useRef } from "react";
import { useTransition } from "react";
import { streamAskAction, StreamMessage } from "@/app/actions/ask-stream";
import { 
  ClarificationResponse, 
  SynthesizedResponse,
  isClarificationResponse,
  isSynthesizedResponse 
} from "@/lib/ask";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | React.ReactNode;
  type?: "text" | "clarification" | "answer" | "error" | "loading";
  metadata?: {
    clarificationResponse?: ClarificationResponse;
    synthesizedResponse?: SynthesizedResponse;
  };
}

interface UseAskStreamOptions {
  onComplete?: (response: SynthesizedResponse) => void;
  onClarification?: (response: ClarificationResponse) => void;
  onError?: (error: string) => void;
}

export function useAskStream(options: UseAskStreamOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isWaitingForClarification, setIsWaitingForClarification] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  // Add a user message to the chat
  const addUserMessage = useCallback((content: string) => {
    const messageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: messageId,
      role: "user",
      content,
      type: "text"
    }]);
    return messageId;
  }, []);

  // Add or update an assistant message
  const addAssistantMessage = useCallback((
    content: string | React.ReactNode, 
    type: ChatMessage["type"] = "text",
    metadata?: ChatMessage["metadata"]
  ) => {
    const messageId = streamingMessageIdRef.current || `assistant-${Date.now()}`;
    
    setMessages(prev => {
      const existingIndex = prev.findIndex(m => m.id === messageId);
      
      if (existingIndex >= 0) {
        // Update existing message
        const newMessages = [...prev];
        const existingMessage = newMessages[existingIndex];
        
        // If streaming text, append to existing content
        if (type === "text" && typeof content === "string" && typeof existingMessage.content === "string") {
          newMessages[existingIndex] = {
            ...existingMessage,
            content: existingMessage.content + content,
            metadata: metadata || existingMessage.metadata
          };
        } else {
          // Replace content for other types
          newMessages[existingIndex] = {
            ...existingMessage,
            content,
            type,
            metadata: metadata || existingMessage.metadata
          };
        }
        return newMessages;
      } else {
        // Add new message
        streamingMessageIdRef.current = messageId;
        return [...prev, {
          id: messageId,
          role: "assistant",
          content,
          type,
          metadata
        }];
      }
    });
    
    return messageId;
  }, []);

  // Stream a question and handle responses
  const streamQuestion = useCallback(async (
    query: string, 
    useConversationId: boolean = true
  ) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Add user message
    addUserMessage(query);
    
    // Add loading message
    streamingMessageIdRef.current = null;
    addAssistantMessage("", "loading");
    
    setIsStreaming(true);

    try {
      // Use server action with streaming
      const stream = await streamAskAction({
        query,
        conversationId: useConversationId ? conversationId || undefined : undefined,
        mode: "enhanced",
        synthesize: true
      });

      const reader = stream.getReader();
      let hasStartedStreaming = false;
      
      while (true) {
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          reader.cancel();
          break;
        }

        const { done, value: message } = await reader.read();
        if (done) break;

        switch (message.type) {
          case "chunk":
            if (!hasStartedStreaming) {
              // Replace loading message with first chunk
              addAssistantMessage(message.content, "text");
              hasStartedStreaming = true;
            } else {
              // Append subsequent chunks
              addAssistantMessage(message.content, "text");
            }
            break;

          case "clarification":
            // Update conversation ID
            if (message.content.conversation_id) {
              setConversationId(message.content.conversation_id);
            }
            
            // Mark that we're waiting for clarification
            setIsWaitingForClarification(true);
            
            // Replace current message with clarification UI
            addAssistantMessage(
              "", // Content will be rendered by component
              "clarification",
              { clarificationResponse: message.content }
            );
            
            options.onClarification?.(message.content);
            break;

          case "complete":
            // Update conversation ID
            if (message.content.conversation_id) {
              setConversationId(message.content.conversation_id);
            }
            
            // Clear clarification waiting state
            setIsWaitingForClarification(false);
            
            // Update the message type to "answer" and store metadata
            addAssistantMessage(
              message.content.answer.text,
              "answer",
              { synthesizedResponse: message.content }
            );
            
            options.onComplete?.(message.content);
            break;

          case "error":
            addAssistantMessage(
              `Error: ${message.content}`,
              "error"
            );
            options.onError?.(message.content);
            break;
        }
      }
      
      reader.releaseLock();
    } catch (error) {
      console.error("Stream error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to stream response";
      
      addAssistantMessage(
        `Error: ${errorMessage}`,
        "error"
      );
      options.onError?.(errorMessage);
    } finally {
      setIsStreaming(false);
      streamingMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [conversationId, addUserMessage, addAssistantMessage, options]);

  // Handle clarification submission
  const submitClarification = useCallback((clarification: string) => {
    // Stream with the existing conversation ID
    streamQuestion(clarification, true);
  }, [streamQuestion]);

  // Reset the conversation
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setIsWaitingForClarification(false);
    streamingMessageIdRef.current = null;
  }, []);

  // Stop streaming
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    isStreaming,
    isPending,
    conversationId,
    isWaitingForClarification,
    streamQuestion,
    submitClarification,
    reset,
    stop,
    addUserMessage,
    addAssistantMessage
  };
}