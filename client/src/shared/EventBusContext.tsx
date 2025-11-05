import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';

// Event types for type safety
export interface EventMap {
  'chat:message': { message: string; user: string; timestamp: Date };
  'chat:userJoined': { user: string };
  'chat:userLeft': { user: string };
  'video:roomJoined': { roomId: string; participants: string[] };
  'video:roomLeft': { roomId: string };
  'video:participantJoined': { roomId: string; participant: string };
  'video:participantLeft': { roomId: string; participant: string };
  'world:playerMoved': { playerId: string; x: number; y: number };
  'world:playerJoined': { playerId: string; x: number; y: number };
  'world:playerLeft': { playerId: string };
  'world:objectInteraction': { playerId: string; objectId: string };
  'area-selected': { areaId: string; areaName: string; roomId: string };
  // Area entry/exit events for Jitsi auto-join/leave
  'area-entered': { areaId: string; areaName: string; roomId: string };
  'area-exited': { areaId: string; areaName: string };
  'app:moduleLoaded': { module: string };
  'app:error': { error: string; module?: string };
  // RingCentral events
  'ringcentral:callStarted': { meetingId: string; participants: any[] };
  'ringcentral:callEnded': { meetingId: string; duration: number };
  'ringcentral:participantJoined': { participant: any };
  'ringcentral:participantLeft': { participantId: string; participantName: string };
  'ringcentral:audioToggled': { participantId: string; muted: boolean };
  'ringcentral:videoToggled': { participantId: string; muted: boolean };
  'ringcentral:error': { error: string; code?: string };
}

type EventCallback<T = any> = (data: T) => void;

interface EventBusInterface {
  publish: <K extends keyof EventMap>(event: K, data: EventMap[K]) => void;
  subscribe: <K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ) => () => void;
  unsubscribe: <K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ) => void;
  clear: () => void;
}

const EventBusContext = createContext<EventBusInterface | null>(null);

export const EventBusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const eventsRef = useRef<Map<string, Set<EventCallback>>>(new Map());

  const publish = useCallback(<K extends keyof EventMap>(
    event: K,
    data: EventMap[K]
  ) => {
    const callbacks = eventsRef.current.get(event as string);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event as string}:`, error);
        }
      });
    }
  }, []);

  const subscribe = useCallback(<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ) => {
    const eventKey = event as string;
    if (!eventsRef.current.has(eventKey)) {
      eventsRef.current.set(eventKey, new Set());
    }
    eventsRef.current.get(eventKey)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = eventsRef.current.get(eventKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          eventsRef.current.delete(eventKey);
        }
      }
    };
  }, []);

  const unsubscribe = useCallback(<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ) => {
    const eventKey = event as string;
    const callbacks = eventsRef.current.get(eventKey);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        eventsRef.current.delete(eventKey);
      }
    }
  }, []);

  const clear = useCallback(() => {
    eventsRef.current.clear();
  }, []);

  // Memoize the eventBus object to prevent unnecessary re-renders
  // This is critical for components that depend on eventBus (like WorldModuleAlt)
  const eventBus: EventBusInterface = useMemo(() => ({
    publish,
    subscribe,
    unsubscribe,
    clear,
  }), [publish, subscribe, unsubscribe, clear]);

  return (
    <EventBusContext.Provider value={eventBus}>
      {children}
    </EventBusContext.Provider>
  );
};

export const useEventBus = (): EventBusInterface => {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  return context;
};

// Custom hook for subscribing to specific events
export const useEventSubscription = <K extends keyof EventMap>(
  event: K,
  callback: EventCallback<EventMap[K]>,
  dependencies: React.DependencyList = []
) => {
  const eventBus = useEventBus();

  React.useEffect(() => {
    const unsubscribe = eventBus.subscribe(event, callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, event, callback, ...dependencies]);
};
