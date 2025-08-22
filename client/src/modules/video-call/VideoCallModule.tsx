import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEventBus } from '../../shared/EventBusContext';
import './VideoCallModule.css';

interface VideoCallModuleProps {
  roomId: string;
  userName: string;
  serverUrl?: string;
  className?: string;
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
  serverUrl = 'meet.jit.si',
  className = '',
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const eventBus = useEventBus();

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
    if (!jitsiContainerRef.current || apiRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      await loadJitsiScript();

      const options = {
        roomName: cleanRoomId,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: { displayName: userName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'hangup', 'chat', 'settings', 'tileview'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      };

      apiRef.current = new window.JitsiMeetExternalAPI(serverUrl, options);
      const api = apiRef.current;

      const eventListeners = {
        videoConferenceJoined: () => {
          setIsJoined(true);
          setIsLoading(false);
          const participantsList = [userName];
          setParticipants(participantsList);
          eventBus.publish('video:roomJoined', {
            roomId: cleanRoomId,
            participants: participantsList,
          });
        },
        videoConferenceLeft: () => {
          setIsJoined(false);
          setParticipants([]);
          eventBus.publish('video:roomLeft', { roomId: cleanRoomId });
        },
        participantJoined: (event: any) => {
          const participantName = event.displayName || 'Anonymous';
          setParticipants(prev => {
            if (!prev.includes(participantName)) {
              const newParticipants = [...prev, participantName];
              eventBus.publish('video:participantJoined', {
                roomId: cleanRoomId,
                participant: participantName,
              });
              return newParticipants;
            }
            return prev;
          });
        },
        participantLeft: (event: any) => {
          const participantName = event.displayName || 'Anonymous';
          setParticipants(prev => {
            const newParticipants = prev.filter(p => p !== participantName);
            eventBus.publish('video:participantLeft', {
              roomId: cleanRoomId,
              participant: participantName,
            });
            return newParticipants;
          });
        },
      };

      api.addEventListeners(eventListeners);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize video call');
      setIsLoading(false);
    }
  }, [cleanRoomId, userName, serverUrl, eventBus, loadJitsiScript]);

  const handleLeaveCall = useCallback(() => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    setIsJoined(false);
    setIsLoading(false);
    setParticipants([]);
    setError(null);
  }, []);

  useEffect(() => {
    return () => handleLeaveCall();
  }, [handleLeaveCall]);

  return (
    <div className={`video-call-module ${className}`}>
      <div className="video-call-header">
        <h3>Video Call - {roomId}</h3>
        <div className="call-info">
          <span>👥 {participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
          {isJoined && <span className="call-status">🟢 Connected</span>}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="video-container">
        {!isJoined && !isLoading && (
          <div className="join-screen">
            <div className="join-content">
              <h4>Join Video Call</h4>
              <p>Room: <strong>{roomId}</strong></p>
              <p>You will join as: <strong>{userName}</strong></p>
              <button onClick={initializeJitsi} className="join-button">
                📹 Join Call
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Connecting to video call...</p>
          </div>
        )}

        <div
          ref={jitsiContainerRef}
          className={`jitsi-container ${isJoined ? 'active' : 'hidden'}`}
        />
      </div>

      {participants.length > 0 && (
        <div className="participants-list">
          <h5>Participants:</h5>
          <div className="participants">
            {participants.map((participant, index) => (
              <span key={index} className="participant">
                👤 {participant}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
