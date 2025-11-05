import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Spin } from 'antd';
import { useEventBus } from '../../shared/EventBusContext';
import { jitsiAnalyticsService } from '../../shared/JitsiAnalyticsService';

interface VideoCallModuleProps {
  roomId: string;
  userName: string;
  serverUrl?: string;
  hideToolbar?: boolean; // Hide all toolbar buttons for minimal UI
  onParticipantCountChange?: (count: number) => void;
  onCallQuality?: (quality: 'good' | 'medium' | 'poor') => void;
  onError?: (error: string) => void;
}

interface JitsiAPI {
  executeCommand: (command: string, ...args: any[]) => void;
  addEventListeners: (listeners: Record<string, Function>) => void;
  dispose: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: any) => JitsiAPI;
  }
}

export const VideoCallModule: React.FC<VideoCallModuleProps> = ({
  roomId,
  userName,
  serverUrl = 'meet.stargety.com',
  hideToolbar = false,
  onParticipantCountChange,
  onCallQuality,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const eventBus = useEventBus();
  const sessionIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  const cleanRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '');

  const loadJitsiScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://${serverUrl}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi Meet API'));
      document.head.appendChild(script);
    });
  }, [serverUrl]);

  const initializeJitsi = useCallback(async () => {
    // Prevent multiple initializations
    if (!jitsiContainerRef.current || apiRef.current || isInitializedRef.current) return;

    isInitializedRef.current = true;

    try {
      setIsLoading(true);
      await loadJitsiScript();

      const toolbarButtons = hideToolbar
        ? ['microphone', 'camera', 'desktop', 'fullscreen', 'settings']
        : ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'chat', 'settings', 'tileview'];

      const options = {
        roomName: cleanRoomId,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: { displayName: userName },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: toolbarButtons,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          FILM_STRIP_MAX_HEIGHT: 120,
        },
      };

      apiRef.current = new window.JitsiMeetExternalAPI(serverUrl, options);
      const api = apiRef.current;

      const eventListeners = {
        videoConferenceJoined: () => {
          setIsLoading(false);
          onParticipantCountChange?.(1);
          eventBus.publish('video:roomJoined', { roomId: cleanRoomId, participants: [userName] });
          sessionIdRef.current = jitsiAnalyticsService.startSession(cleanRoomId);
        },
        videoConferenceLeft: () => {
          onParticipantCountChange?.(0);
          eventBus.publish('video:roomLeft', { roomId: cleanRoomId });
          jitsiAnalyticsService.endSession();
          sessionIdRef.current = null;
        },
        participantJoined: (event: any) => {
          eventBus.publish('video:participantJoined', {
            roomId: cleanRoomId,
            participant: event.displayName || 'Anonymous',
          });
        },
        participantLeft: (event: any) => {
          eventBus.publish('video:participantLeft', {
            roomId: cleanRoomId,
            participant: event.displayName || 'Anonymous',
          });
        },
        participantCountChanged: (event: any) => {
          const count = event.count || 0;
          onParticipantCountChange?.(count);
          jitsiAnalyticsService.logParticipantChange(count);
        },
        connectionQualityChanged: (event: any) => {
          const quality = event.quality || 100;
          let qualityLevel: 'good' | 'medium' | 'poor' = 'good';
          if (quality < 30) qualityLevel = 'poor';
          else if (quality < 70) qualityLevel = 'medium';
          onCallQuality?.(qualityLevel);
          jitsiAnalyticsService.logQualityChange(qualityLevel);
        },
        errorOccurred: (event: any) => {
          const errorMsg = event.error || 'Unknown error occurred';
          console.error('❌ Jitsi error:', errorMsg);
          onError?.(errorMsg);
          jitsiAnalyticsService.logError(errorMsg);
        },
      };

      api.addEventListeners(eventListeners);
    } catch (err) {
      console.error('❌ Jitsi initialization failed:', err);
      setIsLoading(false);
      onError?.(err instanceof Error ? err.message : 'Failed to initialize video call');
    }
  }, [cleanRoomId, userName, serverUrl, eventBus, loadJitsiScript, onParticipantCountChange, onCallQuality, onError]);

  const handleLeaveCall = useCallback(() => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }

    if (sessionIdRef.current) {
      jitsiAnalyticsService.endSession();
      sessionIdRef.current = null;
    }

    isInitializedRef.current = false;
  }, []);

  // Auto-join on mount - only once
  useEffect(() => {
    initializeJitsi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleLeaveCall();
    };
  }, [handleLeaveCall]);

  return (
    <Spin spinning={isLoading} tip="Connecting...">
      <div
        ref={jitsiContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
        }}
      />
    </Spin>
  );
};
