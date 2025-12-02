/**
 * Keyboard Focus Management Utilities
 * 
 * Provides utilities for managing keyboard focus and preventing conflicts
 * between UI controls, text inputs, and canvas interactions.
 */

/**
 * Check if an input element currently has focus
 * 
 * This prevents keyboard shortcuts from triggering when the user is typing
 * in text inputs, textareas, or other editable elements.
 * 
 * @returns true if an input element has focus, false otherwise
 */
export function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  
  if (!activeElement) {
    return false;
  }
  
  // Check for standard input elements
  const tagName = activeElement.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  
  // Check for contenteditable elements
  if (activeElement.hasAttribute('contenteditable')) {
    const contentEditable = activeElement.getAttribute('contenteditable');
    if (contentEditable === 'true' || contentEditable === '') {
      return true;
    }
  }
  
  // Check for Ant Design input components (they may use nested elements)
  if (activeElement.closest('.ant-input, .ant-select, .ant-picker')) {
    return true;
  }
  
  return false;
}

/**
 * Check if a modal or dialog is currently open
 * 
 * This prevents keyboard shortcuts from triggering when a modal is open,
 * as the modal should have priority for keyboard events.
 * 
 * @returns true if a modal is open, false otherwise
 */
export function isModalOpen(): boolean {
  // Check for Ant Design modals
  const antModal = document.querySelector('.ant-modal-wrap');
  if (antModal && window.getComputedStyle(antModal).display !== 'none') {
    return true;
  }
  
  // Check for custom modals
  const customModal = document.querySelector('.modal-overlay');
  if (customModal && window.getComputedStyle(customModal).display !== 'none') {
    return true;
  }
  
  return false;
}

/**
 * Check if keyboard events should be ignored
 * 
 * This is a comprehensive check that combines multiple conditions where
 * keyboard shortcuts should not be triggered.
 * 
 * @returns true if keyboard events should be ignored, false otherwise
 */
export function shouldIgnoreKeyboardEvent(): boolean {
  return isInputFocused() || isModalOpen();
}

/**
 * Make an element focusable and add focus/blur event handlers
 * 
 * @param element - The element to make focusable
 * @param onFocus - Optional callback when element gains focus
 * @param onBlur - Optional callback when element loses focus
 * @returns Cleanup function to remove event listeners
 */
export function makeFocusable(
  element: HTMLElement,
  onFocus?: () => void,
  onBlur?: () => void
): () => void {
  // Make element focusable
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }
  
  // Add event listeners
  const handleFocus = () => {
    element.classList.add('keyboard-focused');
    onFocus?.();
  };
  
  const handleBlur = () => {
    element.classList.remove('keyboard-focused');
    onBlur?.();
  };
  
  element.addEventListener('focus', handleFocus);
  element.addEventListener('blur', handleBlur);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('focus', handleFocus);
    element.removeEventListener('blur', handleBlur);
    element.classList.remove('keyboard-focused');
  };
}

/**
 * Add click-to-focus behavior to an element
 * 
 * @param element - The element to add click-to-focus behavior to
 * @returns Cleanup function to remove event listener
 */
export function addClickToFocus(element: HTMLElement): () => void {
  const handleClick = () => {
    element.focus();
  };
  
  element.addEventListener('click', handleClick);
  
  return () => {
    element.removeEventListener('click', handleClick);
  };
}

/**
 * Check if a specific element or its descendants have focus
 * 
 * @param element - The element to check
 * @returns true if the element or any of its descendants have focus
 */
export function hasFocus(element: HTMLElement): boolean {
  return element.contains(document.activeElement);
}

/**
 * Create a keyboard event filter that only allows events when a specific element has focus
 * 
 * @param element - The element that must have focus
 * @param handler - The keyboard event handler to call when element has focus
 * @returns A filtered keyboard event handler
 */
export function createFocusFilteredHandler(
  element: HTMLElement,
  handler: (event: KeyboardEvent) => void
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    // Ignore if input is focused or modal is open
    if (shouldIgnoreKeyboardEvent()) {
      return;
    }
    
    // Only handle if the element has focus
    if (hasFocus(element)) {
      handler(event);
    }
  };
}

