/**
 * Action Dispatcher Provider
 * 
 * Initializes and manages the InteractiveAreaActionDispatcher.
 * Must be placed inside both EventBusProvider and MapDataProvider.
 */

import React, { useEffect, useRef } from 'react';
import { useEventBus } from './EventBusContext';
import { useMapData } from './MapDataContext';
import { InteractiveAreaActionDispatcher } from './InteractiveAreaActionDispatcher';
import { logger } from './logger';

interface ActionDispatcherProviderProps {
  children: React.ReactNode;
}

export const ActionDispatcherProvider: React.FC<ActionDispatcherProviderProps> = ({ children }) => {
  const eventBus = useEventBus();
  const { mapData } = useMapData();
  const dispatcherRef = useRef<InteractiveAreaActionDispatcher | null>(null);

  // Create and start the dispatcher
  useEffect(() => {
    console.log('🚀 [ActionDispatcherProvider] Initializing dispatcher with map data:', {
      interactiveAreasCount: mapData.interactiveAreas.length,
      areas: mapData.interactiveAreas.map(a => ({ id: a.id, name: a.name, actionType: a.actionType, hasConfig: !!a.actionConfig }))
    });

    // Create a function to look up areas by ID
    const getAreaById = (areaId: string) => {
      const area = mapData.interactiveAreas.find(area => area.id === areaId);
      console.log('🔍 [ActionDispatcherProvider] Looking up area by ID:', { areaId, found: !!area, areaName: area?.name });
      return area;
    };

    // Create the dispatcher
    dispatcherRef.current = new InteractiveAreaActionDispatcher({
      eventBus,
      getAreaById,
    });

    // Start listening to events
    dispatcherRef.current.start();
    console.log('✅ [ActionDispatcherProvider] Dispatcher started');
    logger.info('[ActionDispatcherProvider] Dispatcher started');

    // Cleanup on unmount
    return () => {
      console.log('🛑 [ActionDispatcherProvider] Cleaning up dispatcher');
      dispatcherRef.current?.stop();
      logger.info('[ActionDispatcherProvider] Dispatcher stopped');
    };
  }, [eventBus, mapData]); // Recreate when eventBus or mapData changes

  // Update the getAreaById function when mapData changes
  useEffect(() => {
    if (dispatcherRef.current) {
      // Update the config with new getAreaById function
      (dispatcherRef.current as any).config.getAreaById = (areaId: string) => {
        return mapData.interactiveAreas.find(area => area.id === areaId);
      };
    }
  }, [mapData.interactiveAreas]);

  return <>{children}</>;
};

export default ActionDispatcherProvider;

