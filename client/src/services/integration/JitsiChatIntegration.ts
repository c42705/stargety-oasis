/**
 * JitsiChatIntegration Service
 * 
 * This service manages the integration between chat rooms and Jitsi video calls.
 * It handles:
 * - Mapping chat rooms to Jitsi video rooms
 * - Auto-joining/leaving video calls when entering/exiting chat rooms
 * - Syncing chat presence with video call status
 * - Managing video call state across the application
 */

import { useEventBus } from '../../shared/EventBusContext';
import { useSettings } from '../../shared/SettingsContext';
import { useAuth } from '../../shared/AuthContext';

// Types for Jitsi integration
export interface JitsiRoomMapping {
  chatRoomId: string;
  jitsiRoomName: string;
  autoJoin: boolean;
  enabled: boolean;
}

export interface VideoCallState {
  isActive: boolean;
  currentRoom: string | null;
  participants: string[];
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface ChatRoomWithVideo {
  id: string;
  name: string;
  hasVideoCall: boolean;
  videoCallActive: boolean;
  participantCount: number;
}

class JitsiChatIntegration {
  private static instance: JitsiChatIntegration;
  
  // State
  private currentChatRoom: string | null = null;
  private currentJitsiRoom: string | null = null;
  private isVideoCallActive: boolean = false;
  private autoJoinEnabled: boolean = true;
  private roomMappings: Map<string, JitsiRoomMapping> = new Map();
  
  // Event callbacks
  private onVideoCallStartCallbacks: Set<(roomId: string) => void> = new Set();
  private onVideoCallEndCallbacks: Set<(roomId: string) => void> = new Set();
  private onParticipantJoinCallbacks: Set<(userId: string) => void> = new Set();
  private onParticipantLeaveCallbacks: Set<(userId: string) => void> = new Set();
  
  private constructor() {
    this.initializeDefaultMappings();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): JitsiChatIntegration {
    if (!JitsiChatIntegration.instance) {
      JitsiChatIntegration.instance = new JitsiChatIntegration();
    }
    return JitsiChatIntegration.instance;
  }
  
  /**
   * Initialize default room mappings
   * Maps common chat rooms to Jitsi rooms
   */
  private initializeDefaultMappings() {
    const defaultMappings: JitsiRoomMapping[] = [
      {
        chatRoomId: 'general',
        jitsiRoomName: 'stargety-general',
        autoJoin: true,
        enabled: true
      },
      {
        chatRoomId: 'team-alpha',
        jitsiRoomName: 'stargety-team-alpha',
        autoJoin: true,
        enabled: true
      },
      {
        chatRoomId: 'random',
        jitsiRoomName: 'stargety-random',
        autoJoin: false,
        enabled: true
      }
    ];
    
    defaultMappings.forEach(mapping => {
      this.roomMappings.set(mapping.chatRoomId, mapping);
    });
  }
  
  /**
   * Add or update a room mapping
   */
  public setRoomMapping(mapping: JitsiRoomMapping) {
    this.roomMappings.set(mapping.chatRoomId, mapping);
  }
  
  /**
   * Get room mapping for a chat room
   */
  public getRoomMapping(chatRoomId: string): JitsiRoomMapping | undefined {
    return this.roomMappings.get(chatRoomId);
  }
  
  /**
   * Get all room mappings
   */
  public getAllRoomMappings(): JitsiRoomMapping[] {
    return Array.from(this.roomMappings.values());
  }
  
  /**
   * Check if a chat room has video call enabled
   */
  public hasVideoCallEnabled(chatRoomId: string): boolean {
    const mapping = this.roomMappings.get(chatRoomId);
    return mapping?.enabled ?? false;
  }
  
  /**
   * Check if auto-join is enabled for a chat room
   */
  public isAutoJoinEnabled(chatRoomId: string): boolean {
    const mapping = this.roomMappings.get(chatRoomId);
    return mapping?.autoJoin ?? false;
  }
  
  /**
   * Enable/disable auto-join for a chat room
   */
  public setAutoJoin(chatRoomId: string, enabled: boolean) {
    const mapping = this.roomMappings.get(chatRoomId);
    if (mapping) {
      mapping.autoJoin = enabled;
      this.roomMappings.set(chatRoomId, mapping);
    }
  }
  
  /**
   * Get Jitsi room name for a chat room
   */
  public getJitsiRoomName(chatRoomId: string): string | null {
    const mapping = this.roomMappings.get(chatRoomId);
    return mapping?.jitsiRoomName ?? null;
  }
  
  /**
   * Handle chat room change
   * Called when user enters a new chat room
   */
  public handleChatRoomChange(chatRoomId: string) {
    const previousRoom = this.currentChatRoom;
    this.currentChatRoom = chatRoomId;
    
    // Leave previous video call if any
    if (previousRoom && previousRoom !== chatRoomId) {
      this.leaveVideoCall(previousRoom);
    }
    
    // Join video call if auto-join is enabled
    if (this.isAutoJoinEnabled(chatRoomId)) {
      this.joinVideoCall(chatRoomId);
    }
  }
  
  /**
   * Join a video call for a chat room
   */
  public joinVideoCall(chatRoomId: string) {
    const jitsiRoomName = this.getJitsiRoomName(chatRoomId);
    
    if (!jitsiRoomName) {
      console.warn(`No Jitsi room mapping found for chat room: ${chatRoomId}`);
      return;
    }
    
    if (this.currentJitsiRoom === jitsiRoomName) {
      console.log('Already in video call:', jitsiRoomName);
      return;
    }
    
    console.log('Joining video call:', jitsiRoomName);
    this.currentJitsiRoom = jitsiRoomName;
    this.isVideoCallActive = true;
    
    // Emit event to VideoCommunicationPanel
    this.emitJitsiJoinEvent(jitsiRoomName, chatRoomId);
    
    // Notify callbacks
    this.onVideoCallStartCallbacks.forEach(callback => callback(chatRoomId));
  }
  
  /**
   * Leave a video call for a chat room
   */
  public leaveVideoCall(chatRoomId: string) {
    const jitsiRoomName = this.getJitsiRoomName(chatRoomId);
    
    if (!jitsiRoomName || this.currentJitsiRoom !== jitsiRoomName) {
      return;
    }
    
    console.log('Leaving video call:', jitsiRoomName);
    this.currentJitsiRoom = null;
    this.isVideoCallActive = false;
    
    // Emit event to VideoCommunicationPanel
    this.emitJitsiLeaveEvent(chatRoomId);
    
    // Notify callbacks
    this.onVideoCallEndCallbacks.forEach(callback => callback(chatRoomId));
  }
  
  /**
   * Manually toggle video call for current room
   */
  public toggleVideoCall() {
    if (!this.currentChatRoom) {
      console.warn('No current chat room');
      return;
    }
    
    if (this.isVideoCallActive) {
      this.leaveVideoCall(this.currentChatRoom);
    } else {
      this.joinVideoCall(this.currentChatRoom);
    }
  }
  
  /**
   * Get current video call state
   */
  public getVideoCallState(): VideoCallState {
    return {
      isActive: this.isVideoCallActive,
      currentRoom: this.currentJitsiRoom,
      participants: [], // Would be populated from Jitsi API
      isMuted: false,
      isVideoOff: false
    };
  }
  
  /**
   * Get chat rooms with video call status
   */
  public getChatRoomsWithVideoStatus(rooms: Array<{ id: string; name: string }>): ChatRoomWithVideo[] {
    return rooms.map(room => ({
      id: room.id,
      name: room.name,
      hasVideoCall: this.hasVideoCallEnabled(room.id),
      videoCallActive: this.currentJitsiRoom === this.getJitsiRoomName(room.id),
      participantCount: 0 // Would be populated from Jitsi API
    }));
  }
  
  /**
   * Emit Jitsi join event to EventBus
   */
  private emitJitsiJoinEvent(roomName: string, areaName: string) {
    // This would use the EventBus to notify VideoCommunicationPanel
    // For now, we'll use a custom event
    const event = new CustomEvent('jitsi:join', {
      detail: { roomName, areaName }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Emit Jitsi leave event to EventBus
   */
  private emitJitsiLeaveEvent(areaName: string) {
    const event = new CustomEvent('jitsi:leave', {
      detail: { areaName }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Register callback for video call start
   */
  public onVideoCallStart(callback: (roomId: string) => void) {
    this.onVideoCallStartCallbacks.add(callback);
    return () => this.onVideoCallStartCallbacks.delete(callback);
  }
  
  /**
   * Register callback for video call end
   */
  public onVideoCallEnd(callback: (roomId: string) => void) {
    this.onVideoCallEndCallbacks.add(callback);
    return () => this.onVideoCallEndCallbacks.delete(callback);
  }
  
  /**
   * Register callback for participant join
   */
  public onParticipantJoin(callback: (userId: string) => void) {
    this.onParticipantJoinCallbacks.add(callback);
    return () => this.onParticipantJoinCallbacks.delete(callback);
  }
  
  /**
   * Register callback for participant leave
   */
  public onParticipantLeave(callback: (userId: string) => void) {
    this.onParticipantLeaveCallbacks.add(callback);
    return () => this.onParticipantLeaveCallbacks.delete(callback);
  }
  
  /**
   * Enable/disable auto-join globally
   */
  public setAutoJoinEnabled(enabled: boolean) {
    this.autoJoinEnabled = enabled;
  }
  
  /**
   * Check if auto-join is globally enabled
   */
  public isAutoJoinGloballyEnabled(): boolean {
    return this.autoJoinEnabled;
  }
  
  /**
   * Reset integration state
   */
  public reset() {
    this.currentChatRoom = null;
    this.currentJitsiRoom = null;
    this.isVideoCallActive = false;
  }
}

// Export singleton instance
export const jitsiChatIntegration = JitsiChatIntegration.getInstance();

// Export class for testing or custom instances
export { JitsiChatIntegration };
