import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEventBus } from '../../shared/EventBusContext';
import { jitsiAnalyticsService } from '../../shared/JitsiAnalyticsService';
import './VideoCallModule.css';

interface VideoCallModuleProps {
  roomId: string;
  userName: string;
  serverUrl?: string;
  className?: string;
  autoJoin?: boolean; // Auto-join call when component mounts
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
  className = '',
  autoJoin = false,
  onParticipantCountChange,
  onCallQuality,
  onError,
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor'>('good');

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const eventBus = useEventBus();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const cleanRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '');

  const MAX_RETRIES = 3;
  const BASE_RETRY_DELAY = 1000; // 1 second

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

  const retryWithBackoff = useCallback((attemptNumber: number, initFn: () => Promise<void>) => {
    if (attemptNumber >= MAX_RETRIES) {
      setError(`Failed to connect after ${MAX_RETRIES} attempts. Please check your connection.`);
      setIsLoading(false);
      setIsRetrying(false);
      return;
    }

    const delay = BASE_RETRY_DELAY * Math.pow(2, attemptNumber); // Exponential backoff: 1s, 2s, 4s
    console.log(`🔄 Retry attempt ${attemptNumber + 1}/${MAX_RETRIES} in ${delay}ms...`);

    setIsRetrying(true);
    setError(`Connection failed. Retrying in ${delay / 1000}s... (Attempt ${attemptNumber + 1}/${MAX_RETRIES})`);

    retryTimeoutRef.current = setTimeout(async () => {
      try {
        await initFn();
        setRetryCount(0);
        setIsRetrying(false);
        setError(null);
      } catch (err) {
        console.error(`❌ Retry attempt ${attemptNumber + 1} failed:`, err);
        setRetryCount(attemptNumber + 1);
        retryWithBackoff(attemptNumber + 1, initFn);
      }
    }, delay);
  }, [MAX_RETRIES, BASE_RETRY_DELAY]);

  const initializeJitsi = useCallback(async () => {
    if (!jitsiContainerRef.current || apiRef.current) return;

    const performInitialization = async () => {
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

      console.log('🎬 Creating Jitsi API instance for room:', cleanRoomId);
      apiRef.current = new window.JitsiMeetExternalAPI(serverUrl, options);
      const api = apiRef.current;
      console.log('✅ Jitsi API instance created successfully');

      const eventListeners = {
        videoConferenceJoined: () => {
          console.log('✅ Jitsi: videoConferenceJoined event fired - setting isJoined to true');
          setIsJoined(true);
          setIsLoading(false);
          setRetryCount(0);
          setIsRetrying(false);
          const participantsList = [userName];
          setParticipants(participantsList);
          setParticipantCount(1);
          onParticipantCountChange?.(1);
          eventBus.publish('video:roomJoined', {
            roomId: cleanRoomId,
            participants: participantsList,
          });

          // Start analytics session
          sessionIdRef.current = jitsiAnalyticsService.startSession(cleanRoomId);
        },
        videoConferenceLeft: () => {
          setIsJoined(false);
          setParticipants([]);
          setParticipantCount(0);
          onParticipantCountChange?.(0);
          eventBus.publish('video:roomLeft', { roomId: cleanRoomId });

          // End analytics session
          jitsiAnalyticsService.endSession();
          sessionIdRef.current = null;
        },
        participantJoined: (event: any) => {
          const participantName = event.displayName || 'Anonymous';
          setParticipants(prev => {
            if (!prev.includes(participantName)) {
              const newParticipants = [...prev, participantName];
              const newCount = newParticipants.length;
              setParticipantCount(newCount);
              onParticipantCountChange?.(newCount);
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
            const newCount = newParticipants.length;
            setParticipantCount(newCount);
            onParticipantCountChange?.(newCount);
            eventBus.publish('video:participantLeft', {
              roomId: cleanRoomId,
              participant: participantName,
            });
            return newParticipants;
          });
        },
        // Enhanced event listeners
        participantCountChanged: (event: any) => {
          const count = event.count || 0;
          setParticipantCount(count);
          onParticipantCountChange?.(count);
          console.log(`👥 Participant count changed: ${count}`);

          // Log to analytics
          jitsiAnalyticsService.logParticipantChange(count);
        },
        connectionQualityChanged: (event: any) => {
          // Jitsi provides quality as a percentage (0-100)
          const quality = event.quality || 100;
          let qualityLevel: 'good' | 'medium' | 'poor' = 'good';

          if (quality < 30) {
            qualityLevel = 'poor';
          } else if (quality < 70) {
            qualityLevel = 'medium';
          }

          setConnectionQuality(qualityLevel);
          onCallQuality?.(qualityLevel);
          console.log(`📶 Connection quality: ${qualityLevel} (${quality}%)`);

          // Log to analytics
          jitsiAnalyticsService.logQualityChange(qualityLevel);
        },
        errorOccurred: (event: any) => {
          const errorMsg = event.error || 'Unknown error occurred';
          console.error('❌ Jitsi error:', errorMsg);
          setError(errorMsg);
          onError?.(errorMsg);

          // Log to analytics
          jitsiAnalyticsService.logError(errorMsg);
        },
      };

      api.addEventListeners(eventListeners);
    };

    try {
      await performInitialization();
    } catch (err) {
      console.error('❌ Jitsi initialization failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize video call';

      // Attempt retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        retryWithBackoff(retryCount, performInitialization);
      } else {
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [cleanRoomId, userName, serverUrl, eventBus, loadJitsiScript, retryCount, retryWithBackoff, MAX_RETRIES]);

  const handleLeaveCall = useCallback(() => {
    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }

    // End analytics session if active
    if (sessionIdRef.current) {
      jitsiAnalyticsService.endSession();
      sessionIdRef.current = null;
    }

    setIsJoined(false);
    setIsLoading(false);
    setParticipants([]);
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  // Auto-join effect: automatically join call when autoJoin is true
  useEffect(() => {
    if (autoJoin && !isJoined && !isLoading && !isRetrying) {
      console.log('🎬 Auto-joining Jitsi call for room:', roomId);
      initializeJitsi();
    }
  }, [autoJoin, isJoined, isLoading, isRetrying, roomId, initializeJitsi]);

  // Debug: Log when isJoined changes
  useEffect(() => {
    console.log('🔄 VideoCallModule: isJoined changed to:', isJoined);
    if (isJoined) {
      console.log('✅ Jitsi iframe should now be visible (class: active)');
    } else {
      console.log('❌ Jitsi iframe should be hidden (class: hidden)');
    }
  }, [isJoined]);

  useEffect(() => {
    return () => {
      handleLeaveCall();
      // Clean up retry timeout on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [handleLeaveCall]);

  return (
    <div className={`video-call-module ${className}`}>
      <div className="video-call-header">
        <h3>Video Call - {roomId}</h3>
        <div className="call-info">
          <span>👥 {participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
          {isJoined && (
            <>
              <span className="call-status">🟢 Connected</span>
              <span className={`quality-indicator quality-${connectionQuality}`}>
                {connectionQuality === 'good' && '📶 Good'}
                {connectionQuality === 'medium' && '📶 Medium'}
                {connectionQuality === 'poor' && '📶 Poor'}
              </span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="video-container">
        {!isJoined && !isLoading && !isRetrying && (
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

        {(isLoading || isRetrying) && (
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>{isRetrying ? `Retrying connection... (${retryCount}/${MAX_RETRIES})` : 'Connecting to video call...'}</p>
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
