import React, { useState, useCallback } from 'react';
import { Splitter, Typography } from 'antd';
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
  const leftPanelCollapsed = false;
  const [rightTopPanelSize, setRightTopPanelSize] = useState(60); // Percentage

  // OPTIMIZATION: Enhanced resize handling with validation
  const handleRightPanelResize = useCallback((sizes: number[]) => {
    if (sizes.length >= 2) {
      // Validate size constraints to prevent extreme ratios
      const newSize = Math.max(20, Math.min(80, sizes[0])); // Clamp between 20% and 80%
      setRightTopPanelSize(newSize);

      // Log resize for debugging (only occasionally to avoid spam)
      if (Math.random() < 0.1) {
      }
    }
  }, []);

  // OPTIMIZATION: Enhanced main splitter resize handling
  const handleMainSplitterResize = useCallback((sizes: number[]) => {
    if (sizes.length >= 2) {
      // Validate main splitter constraints
      const leftSize = sizes[0];
      const rightSize = sizes[1];

      // Log extreme ratios for monitoring
      if (leftSize < 20 || leftSize > 85 || rightSize < 15 || rightSize > 80) {
        console.warn('🔧 SPLITTER: Extreme panel ratio detected', {
          leftSize,
          rightSize,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, []);

  return (
    <div className={`split-layout-component ${className}`} style={{ height: '100%', width: '100%' }}>
      <Splitter
        style={{ height: '100%', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
        onResize={handleMainSplitterResize}
      >
        {/* Left Panel - World/Game Area */}
        {/* OPTIMIZATION: Enhanced constraints to prevent extreme ratios */}
        <Splitter.Panel
          defaultSize={leftPanelCollapsed ? "30%" : "70%"}
          min={leftPanelCollapsed ? 50 : 300} // Increased minimum for better game visibility
          max={leftPanelCollapsed ? 50 : "85%"} // Increased maximum to allow more game space
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
        {/* OPTIMIZATION: Enhanced right panel constraints */}
        <Splitter.Panel collapsible
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            minWidth: 250, // Reduced minimum for better flexibility
            maxWidth: '70%' // Reduced maximum to ensure game area gets priority
          }}
        >
          <Splitter
            layout='vertical'
            style={{ height: '100%' }}
            onResize={handleRightPanelResize}
          >
            {/* Top Section - Video Communication */}
            {/* OPTIMIZATION: Enhanced vertical panel constraints */}
            <Splitter.Panel collapsible
              defaultSize={`${rightTopPanelSize}%`}
              min="20%" // Reduced minimum for more flexibility
              max="85%" // Increased maximum for video priority when needed
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
