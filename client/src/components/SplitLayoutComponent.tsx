import React, { useState, useCallback } from 'react';
import { Splitter, Typography } from 'antd';
import { useAuth } from '../shared/AuthContext';
import './SplitLayoutComponent.css';

interface SplitLayoutComponentProps {
  leftPanel: React.ReactNode;
  rightTopPanel: React.ReactNode;
  rightBottomPanel: React.ReactNode;
  className?: string;
}

/**
 * Split Layout Component using Ant Design's Splitter
 * Replaces the sliding panel system with a fixed splitter layout
 */
export const SplitLayoutComponent: React.FC<SplitLayoutComponentProps> = ({
  leftPanel,
  rightTopPanel,
  rightBottomPanel,
  className = ''
}) => {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightTopPanelSize, setRightTopPanelSize] = useState(60); // Percentage


  const handleRightPanelResize = useCallback((sizes: number[]) => {
    if (sizes.length >= 2) {
      setRightTopPanelSize(sizes[0]);
    }
  }, []);

  return (
    <div className={`split-layout-component ${className}`} style={{ height: '100%', width: '100%' }}>
      <Splitter
        style={{ height: '100%', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
      >
        {/* Left Panel - World/Game Area */}
        <Splitter.Panel
          defaultSize={leftPanelCollapsed ? 50 : 600}
          min={leftPanelCollapsed ? 50 : 250}
          max={leftPanelCollapsed ? 50 : "80%"}
          collapsible={{
            start: true
          }}
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            position: 'relative'
          }}
        >
       

          {/* Left Panel Content */}
          <div style={{ height: '100%', width: '100%' }}>
            {leftPanel}
          </div>
        </Splitter.Panel>

        {/* Right Panel - Video & Chat */}
        <Splitter.Panel collapsible
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            minWidth: 300,
            maxWidth: '80%'
          }}
        >
          <Splitter
            layout='vertical'
            style={{ height: '100%' }}
            onResize={handleRightPanelResize}
          >
            {/* Top Section - Video Communication */}
            <Splitter.Panel collapsible
              defaultSize={`${rightTopPanelSize}%`}
              min="30%"
              max="80%"
         
            >
         

              {/* Video Panel Content */}
              <div style={{ height: '100%', width: '100%' }}>
                {rightTopPanel}
              </div>
            </Splitter.Panel>

            {/* Bottom Section - Chat Interface */}
            <Splitter.Panel collapsible
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                position: 'relative'
              }}
            >
              {/* Chat Panel Header */}
              <div style={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 10
              }}>
                <Typography.Text
                  strong
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    border: '1px solid var(--color-border-light)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  💬 Chat
                </Typography.Text>
              </div>

              {/* Chat Panel Content */}
              <div style={{ height: '100%', width: '100%', paddingTop: 40 }}>
                {rightBottomPanel}
              </div>
            </Splitter.Panel>
          </Splitter>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default SplitLayoutComponent;
