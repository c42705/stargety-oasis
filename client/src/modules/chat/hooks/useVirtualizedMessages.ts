import { useMemo, useRef, useCallback } from 'react';
import { Message } from '../../../redux/types/chat';

interface UseVirtualizedMessagesParams {
  messages: Message[];
  containerHeight: number;
  itemHeight: number;
  overscan?: number;
}

interface UseVirtualizedMessagesReturn {
  visibleMessages: Message[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
  scrollToIndex: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook for virtualizing message list to improve performance with large message counts
 * Only renders messages that are currently visible in the viewport
 */
export function useVirtualizedMessages({
  messages,
  containerHeight,
  itemHeight,
  overscan = 5,
}: UseVirtualizedMessagesParams): UseVirtualizedMessagesReturn {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total height of all messages
  const totalHeight = useMemo(() => {
    return messages.length * itemHeight;
  }, [messages.length, itemHeight]);

  // Calculate visible range based on scroll position
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (!containerRef.current) {
      return { startIndex: 0, endIndex: Math.min(messages.length, overscan * 2), offsetY: 0 };
    }

    const scrollTop = containerRef.current.scrollTop;
    
    // Calculate start index (subtract overscan for smooth scrolling)
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    
    // Calculate end index (add overscan for smooth scrolling)
    const endIndex = Math.min(
      messages.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex, offsetY: scrollTop };
  }, [messages.length, containerHeight, itemHeight, overscan]);

  // Get visible messages
  const visibleMessages = useMemo(() => {
    return messages.slice(startIndex, endIndex);
  }, [messages, startIndex, endIndex]);

  // Scroll to specific message index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
    }
  }, [itemHeight]);

  return {
    visibleMessages,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollToIndex,
    containerRef,
  };
}
