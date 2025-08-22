import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '../shared/AuthContext';
import './SlidingPanel.css';

export interface PanelTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface SlidingPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  tabs: PanelTab[];
  className?: string;
}

export const SlidingPanel: React.FC<SlidingPanelProps> = ({
  isOpen,
  onToggle,
  tabs,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '');
  const { user } = useAuth();

  // Set first tab as active when tabs change
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onToggle();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onToggle]);

  // Prevent body scroll when panel is open on mobile
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

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="sliding-panel-overlay"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div className={`sliding-panel ${isOpen ? 'open' : 'closed'} ${className}`}>
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-title">
            <h3>Workspace</h3>
            <span className="user-indicator">
              {user?.displayName}
              {user?.isAdmin && <span className="admin-badge-small">Admin</span>}
            </span>
          </div>
          <button
            className="panel-close-button"
            onClick={onToggle}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="panel-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="panel-content">
          {activeTabData && (
            <div className="tab-content-wrapper">
              {activeTabData.component}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Panel Toggle Button Component
interface PanelToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const PanelToggle: React.FC<PanelToggleProps> = ({
  isOpen,
  onToggle,
  className = ''
}) => {
  return (
    <button
      className={`panel-toggle ${isOpen ? 'open' : ''} ${className}`}
      onClick={onToggle}
      aria-label={isOpen ? 'Close chat panel' : 'Open chat panel'}
      aria-expanded={isOpen}
    >
      <div className="chat-icon">
        {isOpen ? (
          <X size={20} className="close-icon" />
        ) : (
          <MessageCircle size={20} className="message-icon" />
        )}
      </div>
    </button>
  );
};

export default SlidingPanel;
