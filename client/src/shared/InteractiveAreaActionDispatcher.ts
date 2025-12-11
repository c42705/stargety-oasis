/**
 * Interactive Area Action Dispatcher
 * 
 * Handles dispatching actions when players enter/exit interactive areas.
 * Supports multiple action types: jitsi, alert, url, modal.
 */

import { message, Modal } from 'antd';
import { 
  InteractiveArea, 
  InteractiveAreaActionType,
  JitsiActionConfig,
  AlertActionConfig,
  UrlActionConfig,
  ModalActionConfig,
  getJitsiRoomNameForArea,
} from './MapDataContext';
import { EventBus } from './EventBusContext';
import { logger } from './logger';

export interface ActionDispatcherConfig {
  eventBus: EventBus;
  getAreaById: (areaId: string) => InteractiveArea | undefined;
}

export class InteractiveAreaActionDispatcher {
  private config: ActionDispatcherConfig;
  private unsubscribeEntered?: () => void;
  private unsubscribeExited?: () => void;
  private currentJitsiArea: InteractiveArea | null = null;

  constructor(config: ActionDispatcherConfig) {
    this.config = config;
  }

  /** Start listening to area events */
  start(): void {
    this.unsubscribeEntered = this.config.eventBus.subscribe('area-entered', this.handleAreaEntered);
    this.unsubscribeExited = this.config.eventBus.subscribe('area-exited', this.handleAreaExited);
    logger.info('[ActionDispatcher] Started listening to area events');
  }

  /** Stop listening to area events */
  stop(): void {
    this.unsubscribeEntered?.();
    this.unsubscribeExited?.();
    logger.info('[ActionDispatcher] Stopped listening to area events');
  }

  private handleAreaEntered = (data: { areaId: string; areaName: string; roomId: string }): void => {
    const area = this.config.getAreaById(data.areaId);
    if (!area) {
      logger.warn('[ActionDispatcher] Area not found', { areaId: data.areaId });
      return;
    }

    logger.info('[ActionDispatcher] Area entered', { name: area.name, actionType: area.actionType });
    this.dispatchAction(area, 'enter');
  };

  private handleAreaExited = (data: { areaId: string; areaName: string }): void => {
    const area = this.config.getAreaById(data.areaId);
    if (!area) return;

    logger.info('[ActionDispatcher] Area exited', { name: area.name });
    this.dispatchAction(area, 'exit');
  };

  private dispatchAction(area: InteractiveArea, trigger: 'enter' | 'exit'): void {
    const actionType = area.actionType || 'none';
    
    switch (actionType) {
      case 'jitsi':
        this.handleJitsiAction(area, trigger);
        break;
      case 'alert':
        if (trigger === 'enter') this.handleAlertAction(area);
        break;
      case 'url':
        if (trigger === 'enter') this.handleUrlAction(area);
        break;
      case 'modal':
        if (trigger === 'enter') this.handleModalAction(area);
        break;
      case 'none':
      default:
        // No action
        break;
    }
  }

  private handleJitsiAction(area: InteractiveArea, trigger: 'enter' | 'exit'): void {
    const config = area.actionConfig as JitsiActionConfig | null;
    const roomName = getJitsiRoomNameForArea(area);

    if (trigger === 'enter' && config?.autoJoinOnEntry !== false) {
      this.currentJitsiArea = area;
      // Emit jitsi:join event for VideoCommunicationPanel to handle
      this.config.eventBus.publish('jitsi:join', { roomName, areaName: area.name });
    } else if (trigger === 'exit' && config?.autoLeaveOnExit !== false) {
      if (this.currentJitsiArea?.id === area.id) {
        this.currentJitsiArea = null;
        // Emit jitsi:leave event for VideoCommunicationPanel to handle
        this.config.eventBus.publish('jitsi:leave', { areaName: area.name });
      }
    }
  }

  private handleAlertAction(area: InteractiveArea): void {
    const config = area.actionConfig as AlertActionConfig | null;
    if (!config?.message) return;

    const alertFn = config.alertType === 'error' ? message.error 
      : config.alertType === 'warning' ? message.warning
      : config.alertType === 'success' ? message.success
      : message.info;
    
    alertFn(config.message, config.duration ? config.duration / 1000 : 5);
  }

  private handleUrlAction(area: InteractiveArea): void {
    const config = area.actionConfig as UrlActionConfig | null;
    if (!config?.url) return;

    if (config.openMode === 'newTab') {
      window.open(config.url, '_blank');
    } else if (config.openMode === 'sameTab') {
      window.location.href = config.url;
    }
    // 'embedded' mode would need UI integration - TODO
  }

  private handleModalAction(area: InteractiveArea): void {
    const config = area.actionConfig as ModalActionConfig | null;
    if (!config?.title || !config.showOnEntry) return;

    Modal.info({
      title: config.title,
      content: config.content,
      okText: 'Close',
    });
  }
}

