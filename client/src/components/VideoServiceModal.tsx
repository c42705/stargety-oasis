import React, { useState, useEffect } from 'react';
import { useSettings } from '../shared/SettingsContext';
import { useAuth } from '../shared/AuthContext';
import { VideoCallModule } from '../modules/video-call/VideoCallModule';
import { useModalRegistration } from '../shared/ModalStateManager';
import './VideoServiceModal.css';

interface VideoServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  roomId?: string;
  isLoading: boolean;
}

export const VideoServiceModal: React.FC<VideoServiceModalProps> = ({
  isOpen,
  onClose,
  areaName,
  roomId,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { settings } = useSettings();
  const { user } = useAuth();

  // Register this modal with the global modal state system
  useModalRegistration('video-service-modal', isOpen, {
    type: 'modal',
    priority: 110, // Higher priority than avatar customizer
    blockBackground: true
  });

  // Simulate loading progress
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 15 + 5; // Random progress increments
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isExpanded) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isExpanded, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const handleClose = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setTimeout(() => {
        onClose();
      }, 300);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const renderVideoService = () => {
    if (!user) return null;

    const videoRoomId = roomId || areaName.toLowerCase().replace(/\s+/g, '-');

    return (
      <VideoCallModule
        roomId={videoRoomId}
        userName={user.username}
      />
    );
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`video-modal-overlay ${isExpanded ? 'expanded' : ''}`}
        onClick={!isExpanded ? handleClose : undefined}
      />

      {/* Modal */}
      <div className={`video-service-modal ${isExpanded ? 'expanded' : ''}`}>
        {/* Loading Screen */}
        {isLoading && (
          <div className="video-loading-screen">
            <div className="loading-content">
              <div className="loading-spinner-large">
                <div className="spinner-ring"></div>
              </div>
              <h3>Connecting to {areaName}</h3>
              <p>Join the weekly team sync</p>
              
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  Loading... {Math.round(Math.min(loadingProgress, 100))}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Video Service Content */}
        {!isLoading && (
          <>
            {/* Modal Header */}
            <div className="video-modal-header">
              <div className="modal-title">
                <h3>{areaName}</h3>
                <span className="service-indicator">
                  📹 Jitsi Meet
                </span>
              </div>
              
              <div className="modal-controls">
                {!isExpanded && (
                  <button
                    className="expand-button"
                    onClick={handleExpand}
                    title="Expand to full screen"
                  >
                    ⛶
                  </button>
                )}
                {isExpanded && (
                  <button
                    className="collapse-button"
                    onClick={handleCollapse}
                    title="Collapse to window"
                  >
                    ⛶
                  </button>
                )}
                <button
                  className="close-button"
                  onClick={handleClose}
                  title="Close meeting"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Video Service Module */}
            <div className="video-service-container">
              {renderVideoService()}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default VideoServiceModal;
