import React, { useEffect, useRef } from 'react';

interface VideoCallModuleProps {
  roomId: string;
  userName: string;
  serverUrl?: string;
  hideToolbar?: boolean;
  onParticipantCountChange?: (count: number) => void;
  onCallQuality?: (quality: 'good' | 'medium' | 'poor') => void;
  onError?: (error: string) => void;
}

interface JitsiAPI {
  dispose: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: any) => JitsiAPI;
  }
}

/**
 * Simple Jitsi Video Call Module
 * Displays a Jitsi Meet iframe with minimal configuration
 */
export const VideoCallModule: React.FC<VideoCallModuleProps> = ({
  roomId,
  userName,
  serverUrl = 'meet.stargety.com',
  hideToolbar = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);

  // Clean room ID (remove special characters)
  const cleanRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '');

  // Extract domain from serverUrl (strip http:// or https:// if present)
  const cleanServerUrl = serverUrl.replace(/^https?:\/\//, '');

  useEffect(() => {
    console.log('🎥 VideoCallModule mounted - Room:', cleanRoomId, 'User:', userName);

    // Load Jitsi script if not already loaded
    const loadJitsi = async () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://${cleanServerUrl}/external_api.js`;
      script.async = true;
      script.onload = () => {
        console.log('✅ Jitsi script loaded');
        initializeJitsi();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Jitsi script');
      };
      document.body.appendChild(script);
    };

    // Initialize Jitsi Meet
    const initializeJitsi = () => {
      if (!containerRef.current || apiRef.current) {
        console.log('⚠️ Skipping Jitsi init - container:', !!containerRef.current, 'api:', !!apiRef.current);
        return;
      }

      console.log('🎬 Initializing Jitsi for room:', cleanRoomId);

      const toolbarButtons = hideToolbar
        ? ['microphone', 'camera', 'desktop', 'fullscreen']
        : ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'chat', 'settings', 'tileview'];

      const options = {
        roomName: cleanRoomId,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName,
        },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          prejoinConfig: {
            enabled: false,
          },
          disableDeepLinking: true,
          // Additional settings to skip prejoin
          requireDisplayName: false,
          enableInsecureRoomNameWarning: false,
          disableInitialGUM: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: toolbarButtons,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          FILM_STRIP_MAX_HEIGHT: 120,
          // Skip prejoin screen
          DISABLE_FOCUS_INDICATOR: true,
          MOBILE_APP_PROMO: false,
        },
      };

      try {
        apiRef.current = new window.JitsiMeetExternalAPI(cleanServerUrl, options);
        console.log('✅ Jitsi initialized successfully');
      } catch (error) {
        console.error('❌ Jitsi initialization error:', error);
      }
    };

    loadJitsi();

    // Cleanup on unmount
    return () => {
      console.log('🔴 VideoCallModule unmounting - cleaning up');
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [cleanRoomId, userName, cleanServerUrl, hideToolbar]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
      }}
    />
  );
};

export default VideoCallModule;

