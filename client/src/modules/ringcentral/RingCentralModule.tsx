import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEventBus } from '../../shared/EventBusContext';
import { RingCentralService } from './RingCentralService';
import {
  RingCentralCallState,
  RingCentralParticipant,
  RingCentralConfig,
} from './types';
import './RingCentralModule.css';

interface RingCentralModuleProps {
  userName: string;
  className?: string;
}

export const RingCentralModule: React.FC<RingCentralModuleProps> = ({
  userName,
  className = '',
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callState, setCallState] = useState<RingCentralCallState | null>(null);
  const [loginCredentials, setLoginCredentials] = useState({
    username: userName,
    password: '',
  });

  const serviceRef = useRef<RingCentralService | null>(null);
  const eventBus = useEventBus();

  // Initialize RingCentral Service
  useEffect(() => {
    const config: RingCentralConfig = {
      clientId: process.env.REACT_APP_RINGCENTRAL_CLIENT_ID || 'mock-client-id',
      clientSecret: process.env.REACT_APP_RINGCENTRAL_CLIENT_SECRET || 'mock-client-secret',
      server: process.env.REACT_APP_RINGCENTRAL_SERVER || 'https://platform.devtest.ringcentral.com',
      redirectUri: process.env.REACT_APP_RINGCENTRAL_REDIRECT_URI || 'http://localhost:3000/callback',
    };

    serviceRef.current = new RingCentralService(config);

    // Set up event listeners
    serviceRef.current.onCallStateChanged((state: RingCentralCallState) => {
      setCallState(state);

      // Publish to event bus
      if (state.isInCall && state.currentMeeting) {
        eventBus.publish('ringcentral:callStarted', {
          meetingId: state.currentMeeting.id,
          participants: state.participants,
        });
      } else if (!state.isInCall) {
        eventBus.publish('ringcentral:callEnded', {
          meetingId: 'ended',
          duration: 0,
        });
      }
    });

    serviceRef.current.onParticipantJoined((participant: RingCentralParticipant) => {
      eventBus.publish('ringcentral:participantJoined', { participant });
    });

    serviceRef.current.onParticipantLeft((participantId: string) => {
      const participantName = callState?.participants.find(p => p.id === participantId)?.name || 'Unknown';
      eventBus.publish('ringcentral:participantLeft', { participantId, participantName });
    });

    return () => {
      if (serviceRef.current) {
        serviceRef.current.logout();
      }
    };
  }, [eventBus, callState?.participants]);

  const handleLogin = useCallback(async () => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const user = await serviceRef.current.login(loginCredentials);
      setIsLoggedIn(true);
      console.log('RingCentral login successful:', user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, [loginCredentials]);

  const handleLogout = useCallback(async () => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    try {
      await serviceRef.current.logout();
      setIsLoggedIn(false);
      setCallState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartCall = useCallback(async () => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const meeting = await serviceRef.current.createInstantMeeting(`${userName}'s Meeting`);
      await serviceRef.current.joinMeeting(meeting.id, meeting.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call');
    } finally {
      setIsLoading(false);
    }
  }, [userName]);

  const handleEndCall = useCallback(async () => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    try {
      await serviceRef.current.leaveMeeting();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end call');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggleAudio = useCallback(async () => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.toggleAudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle audio');
    }
  }, []);

  const handleToggleVideo = useCallback(async () => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.toggleVideo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle video');
    }
  }, []);

  // Render Login Form
  const renderLoginForm = () => (
    <div className="ringcentral-login">
      <h3>🔗 RingCentral Video</h3>
      <p className="login-subtitle">Connect to start video calls</p>

      <div className="login-form">
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            type="text"
            value={loginCredentials.username}
            onChange={(e) => setLoginCredentials(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Enter your username"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={loginCredentials.password}
            onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Enter password (demo mode)"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading || !loginCredentials.username}
          className="login-button"
        >
          {isLoading ? 'Connecting...' : 'Connect to RingCentral'}
        </button>
      </div>

      <div className="demo-notice">
        <p>🎭 <strong>Demo Mode:</strong> This is a simulation of RingCentral integration.</p>
        <p>Enter any username and password to test the functionality.</p>
      </div>
    </div>
  );

  // Render Call Interface
  const renderCallInterface = () => (
    <div className="ringcentral-interface">
      <div className="interface-header">
        <h3>📞 RingCentral Video</h3>
        <button onClick={handleLogout} className="logout-button" disabled={isLoading}>
          Disconnect
        </button>
      </div>

      {!callState?.isInCall ? (
        <div className="call-setup">
          <div className="user-info">
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h4>{userName}</h4>
              <p>Ready to start a video call</p>
            </div>
          </div>

          <button
            onClick={handleStartCall}
            disabled={isLoading}
            className="start-call-button"
          >
            {isLoading ? 'Starting Call...' : '🎥 Start Video Call'}
          </button>
        </div>
      ) : (
        <div className="active-call">
          <div className="call-header">
            <h4>📹 {callState.currentMeeting?.topic}</h4>
            <div className="call-info">
              <span className="call-status">🟢 Connected</span>
              <span className="participant-count">
                {callState.participants.length} participant{callState.participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="participants-list">
            <h5>Participants:</h5>
            {callState.participants.map((participant) => (
              <div key={participant.id} className="participant-item">
                <div className="participant-avatar">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="participant-info">
                  <span className="participant-name">{participant.name}</span>
                  <div className="participant-status">
                    {participant.role === 'Host' && <span className="host-badge">Host</span>}
                    {participant.audioMuted && <span className="muted-badge">🔇</span>}
                    {participant.videoMuted && <span className="video-off-badge">📹</span>}
                    {participant.isScreenSharing && <span className="screen-share-badge">🖥️</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="call-controls">
            <button
              onClick={handleToggleAudio}
              className={`control-button ${callState.localParticipant?.audioMuted ? 'muted' : ''}`}
              title="Toggle Audio"
            >
              {callState.localParticipant?.audioMuted ? '🔇' : '🎤'}
            </button>

            <button
              onClick={handleToggleVideo}
              className={`control-button ${callState.localParticipant?.videoMuted ? 'muted' : ''}`}
              title="Toggle Video"
            >
              {callState.localParticipant?.videoMuted ? '📹' : '🎥'}
            </button>

            <button
              onClick={handleEndCall}
              className="control-button end-call"
              disabled={isLoading}
              title="End Call"
            >
              📞
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`ringcentral-module ${className}`}>
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {!isLoggedIn ? renderLoginForm() : renderCallInterface()}
    </div>
  );
};
