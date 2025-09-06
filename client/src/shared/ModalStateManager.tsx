import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface ModalState {
  id: string;
  type: 'modal' | 'drawer' | 'popup';
  priority: number; // Higher priority modals can override lower ones
  blockBackground: boolean; // Whether this modal should block background interactions
}

interface ModalStateContextType {
  activeModals: ModalState[];
  isAnyModalOpen: boolean;
  shouldBlockBackground: boolean;
  registerModal: (modal: ModalState) => void;
  unregisterModal: (modalId: string) => void;
  updateModal: (modalId: string, updates: Partial<ModalState>) => void;
  getHighestPriorityModal: () => ModalState | null;
}

const ModalStateContext = createContext<ModalStateContextType | null>(null);

/**
 * Global Modal State Manager
 * Tracks all open modals and provides utilities to prevent background interactions
 */
export const ModalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModals, setActiveModals] = useState<ModalState[]>([]);

  // Register a new modal
  const registerModal = useCallback((modal: ModalState) => {
    setActiveModals(prev => {
      // Remove existing modal with same ID if it exists
      const filtered = prev.filter(m => m.id !== modal.id);
      // Add new modal and sort by priority (highest first)
      return [...filtered, modal].sort((a, b) => b.priority - a.priority);
    });
  }, []);

  // Unregister a modal
  const unregisterModal = useCallback((modalId: string) => {
    setActiveModals(prev => prev.filter(m => m.id !== modalId));
  }, []);

  // Update modal properties
  const updateModal = useCallback((modalId: string, updates: Partial<ModalState>) => {
    setActiveModals(prev => 
      prev.map(modal => 
        modal.id === modalId ? { ...modal, ...updates } : modal
      ).sort((a, b) => b.priority - a.priority)
    );
  }, []);

  // Get the highest priority modal
  const getHighestPriorityModal = useCallback(() => {
    return activeModals.length > 0 ? activeModals[0] : null;
  }, [activeModals]);

  // Computed values
  const isAnyModalOpen = activeModals.length > 0;
  const shouldBlockBackground = activeModals.some(modal => modal.blockBackground);

  // Add global event listener to prevent background clicks when modals are open
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (shouldBlockBackground) {
        // Check if the click is outside any modal content
        const target = event.target as Element;
        const isInsideModal = target.closest('.ant-modal-content, .ant-drawer-content, .ant-popover-content');
        
        if (!isInsideModal) {
          // Prevent the event from propagating to background handlers
          event.stopPropagation();
          event.preventDefault();
          
          // Add visual feedback that background is blocked
          const body = document.body;
          body.style.cursor = 'not-allowed';
          setTimeout(() => {
            body.style.cursor = '';
          }, 200);
        }
      }
    };

    if (shouldBlockBackground) {
      // Use capture phase to intercept events before they reach other handlers
      document.addEventListener('click', handleGlobalClick, { capture: true });
      document.addEventListener('mousedown', handleGlobalClick, { capture: true });
      
      // Also prevent keyboard interactions that might trigger background actions
      const handleKeyDown = (event: KeyboardEvent) => {
        // Allow modal-specific keys (Escape, Tab, etc.)
        const allowedKeys = ['Escape', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (!allowedKeys.includes(event.key)) {
          // Check if focus is inside a modal
          const activeElement = document.activeElement;
          const isInsideModal = activeElement?.closest('.ant-modal-content, .ant-drawer-content, .ant-popover-content');
          
          if (!isInsideModal) {
            event.stopPropagation();
            event.preventDefault();
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown, { capture: true });
      
      return () => {
        document.removeEventListener('click', handleGlobalClick, { capture: true });
        document.removeEventListener('mousedown', handleGlobalClick, { capture: true });
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
      };
    }
  }, [shouldBlockBackground]);

  // Add body class when modals are open for CSS styling
  useEffect(() => {
    if (shouldBlockBackground) {
      document.body.classList.add('modal-background-blocked');
    } else {
      document.body.classList.remove('modal-background-blocked');
    }
    
    return () => {
      document.body.classList.remove('modal-background-blocked');
    };
  }, [shouldBlockBackground]);

  const contextValue: ModalStateContextType = {
    activeModals,
    isAnyModalOpen,
    shouldBlockBackground,
    registerModal,
    unregisterModal,
    updateModal,
    getHighestPriorityModal
  };

  return (
    <ModalStateContext.Provider value={contextValue}>
      {children}
    </ModalStateContext.Provider>
  );
};

/**
 * Hook to access modal state management
 */
export const useModalState = () => {
  const context = useContext(ModalStateContext);
  if (!context) {
    throw new Error('useModalState must be used within a ModalStateProvider');
  }
  return context;
};

/**
 * Hook for individual modals to register themselves
 */
export const useModalRegistration = (
  modalId: string,
  isOpen: boolean,
  options: {
    type?: 'modal' | 'drawer' | 'popup';
    priority?: number;
    blockBackground?: boolean;
  } = {}
) => {
  const { registerModal, unregisterModal } = useModalState();
  
  const {
    type = 'modal',
    priority = 100,
    blockBackground = true
  } = options;

  useEffect(() => {
    if (isOpen) {
      registerModal({
        id: modalId,
        type,
        priority,
        blockBackground
      });
    } else {
      unregisterModal(modalId);
    }

    // Cleanup on unmount
    return () => {
      unregisterModal(modalId);
    };
  }, [isOpen, modalId, type, priority, blockBackground, registerModal, unregisterModal]);
};

/**
 * Higher-order component to wrap modals with automatic registration
 */
export const withModalRegistration = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  modalId: string,
  options?: {
    type?: 'modal' | 'drawer' | 'popup';
    priority?: number;
    blockBackground?: boolean;
  }
) => {
  return React.forwardRef<any, P & { open?: boolean; visible?: boolean }>((props, ref) => {
    const { open, visible, ...restProps } = props;
    const isOpen = open || visible || false;

    useModalRegistration(modalId, isOpen, options);

    return <WrappedComponent {...(restProps as P)} ref={ref} />;
  });
};

/**
 * Utility function to check if background interactions should be blocked
 */
export const shouldBlockBackgroundInteractions = (): boolean => {
  // This can be called from outside React components
  const body = document.body;
  return body.classList.contains('modal-background-blocked');
};

export default ModalStateProvider;
