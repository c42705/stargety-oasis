/**
 * Chat Module Animations
 *
 * Provides animation utilities and keyframes for chat components
 * using Ant Design's motion components and CSS animations
 */

// CSSObject type definition
export interface CSSObject {
  [key: string]: any;
}

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  VERY_SLOW: 500,
} as const;

// Animation easings
export const ANIMATION_EASING = {
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Message animations
export const messageAnimations = {
  // Fade in animation for new messages
  fadeIn: {
    opacity: [0, 1],
    transform: ['translateY(10px)', 'translateY(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // Slide in from left (for received messages)
  slideInLeft: {
    opacity: [0, 1],
    transform: ['translateX(-20px)', 'translateX(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // Slide in from right (for sent messages)
  slideInRight: {
    opacity: [0, 1],
    transform: ['translateX(20px)', 'translateX(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // Scale in animation
  scaleIn: {
    opacity: [0, 1],
    transform: ['scale(0.9)', 'scale(1)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.BOUNCE,
    },
  },

  // Message deletion animation
  delete: {
    opacity: [1, 0],
    transform: ['scale(1)', 'scale(0.9)'],
    transition: {
      duration: ANIMATION_DURATION.FAST,
      ease: ANIMATION_EASING.EASE_IN,
    },
  },

  // Message edit highlight animation
  editHighlight: {
    backgroundColor: ['#fff7e6', '#ffffff'],
    transition: {
      duration: ANIMATION_DURATION.VERY_SLOW,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },
} as const;

// Reaction animations
export const reactionAnimations = {
  // Pop in animation for reactions
  popIn: {
    opacity: [0, 1],
    transform: ['scale(0)', 'scale(1.2)', 'scale(1)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.BOUNCE,
    },
  },

  // Bounce animation on hover
  bounce: {
    transform: ['scale(1)', 'scale(1.2)', 'scale(1)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.BOUNCE,
    },
  },

  // Shake animation for error
  shake: {
    transform: ['translateX(0)', 'translateX(-5px)', 'translateX(5px)', 'translateX(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_IN_OUT,
    },
  },
} as const;

// Typing indicator animations
export const typingAnimations = {
  // Dot bounce animation
  dotBounce: {
    animation: 'typingBounce 1.4s infinite ease-in-out both',
  },

  // Fade in for typing indicator
  fadeIn: {
    opacity: [0, 1],
    transform: ['translateY(-5px)', 'translateY(0)'],
    transition: {
      duration: ANIMATION_DURATION.FAST,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },
} as const;

// File upload animations
export const fileUploadAnimations = {
  // Progress bar animation
  progress: {
    width: ['0%', '100%'],
    transition: {
      duration: ANIMATION_DURATION.SLOW,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // File item slide in
  slideIn: {
    opacity: [0, 1],
    transform: ['translateY(-10px)', 'translateY(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // Success checkmark animation
  success: {
    opacity: [0, 1],
    transform: ['scale(0)', 'scale(1)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.BOUNCE,
    },
  },
} as const;

// Thread animations
export const threadAnimations = {
  // Expand animation
  expand: {
    height: ['0px', 'auto'],
    opacity: [0, 1],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // Collapse animation
  collapse: {
    height: ['auto', '0px'],
    opacity: [1, 0],
    transition: {
      duration: ANIMATION_DURATION.FAST,
      ease: ANIMATION_EASING.EASE_IN,
    },
  },

  // Thread reply slide in
  replySlideIn: {
    opacity: [0, 1],
    transform: ['translateX(-10px)', 'translateX(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },
} as const;

// Search animations
export const searchAnimations = {
  // Results fade in
  resultsFadeIn: {
    opacity: [0, 1],
    transform: ['translateY(-5px)', 'translateY(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // Highlight animation
  highlight: {
    backgroundColor: ['#fff7e6', '#ffffff'],
    transition: {
      duration: ANIMATION_DURATION.VERY_SLOW,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },
} as const;

// Panel animations
export const panelAnimations = {
  // Slide in from right
  slideInRight: {
    opacity: [0, 1],
    transform: ['translateX(100%)', 'translateX(0)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },

  // Slide out to right
  slideOutRight: {
    opacity: [1, 0],
    transform: ['translateX(0)', 'translateX(100%)'],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_IN,
    },
  },

  // Fade in
  fadeIn: {
    opacity: [0, 1],
    transition: {
      duration: ANIMATION_DURATION.NORMAL,
      ease: ANIMATION_EASING.EASE_OUT,
    },
  },
} as const;

// CSS keyframes for complex animations
export const keyframes = {
  // Typing indicator dot bounce
  typingBounce: `
    @keyframes typingBounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }
  `,

  // Pulse animation for notifications
  pulse: `
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `,

  // Spin animation for loading
  spin: `
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,

  // Fade in up
  fadeInUp: `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  // Shake animation
  shake: `
    @keyframes shake {
      0%, 100% {
        transform: translateX(0);
      }
      10%, 30%, 50%, 70%, 90% {
        transform: translateX(-5px);
      }
      20%, 40%, 60%, 80% {
        transform: translateX(5px);
      }
    }
  `,

  // Bounce in
  bounceIn: `
    @keyframes bounceIn {
      0% {
        opacity: 0;
        transform: scale(0.3);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
      70% {
        transform: scale(0.9);
      }
      100% {
        transform: scale(1);
      }
    }
  `,
} as const;

// Helper function to create animation styles
export function createAnimationStyles(
  animation: typeof messageAnimations.fadeIn,
  delay: number = 0
): CSSObject {
  return {
    animation: `${animation.transition.duration}ms ${animation.transition.ease} ${delay}ms`,
    ...animation,
  };
}

// Helper function to create staggered animations
export function createStaggeredAnimation(
  baseAnimation: typeof messageAnimations.fadeIn,
  count: number,
  staggerDelay: number = 50
): CSSObject[] {
  return Array.from({ length: count }, (_, index) => ({
    ...baseAnimation,
    transition: {
      ...baseAnimation.transition,
      delay: index * staggerDelay,
    },
  }));
}

// Animation presets for common use cases
export const animationPresets = {
  // New message animation
  newMessage: {
    ...messageAnimations.fadeIn,
    ...messageAnimations.scaleIn,
  },

  // Message sent animation
  messageSent: {
    ...messageAnimations.slideInRight,
    ...messageAnimations.scaleIn,
  },

  // Message received animation
  messageReceived: {
    ...messageAnimations.slideInLeft,
    ...messageAnimations.scaleIn,
  },

  // Reaction added animation
  reactionAdded: {
    ...reactionAnimations.popIn,
  },

  // Typing indicator animation
  typingIndicator: {
    ...typingAnimations.fadeIn,
  },

  // File upload complete animation
  fileUploadComplete: {
    ...fileUploadAnimations.success,
  },

  // Thread expand animation
  threadExpand: {
    ...threadAnimations.expand,
  },

  // Search result animation
  searchResult: {
    ...searchAnimations.resultsFadeIn,
  },
} as const;

// Export all animations as a single object
export const chatAnimations = {
  message: messageAnimations,
  reaction: reactionAnimations,
  typing: typingAnimations,
  fileUpload: fileUploadAnimations,
  thread: threadAnimations,
  search: searchAnimations,
  panel: panelAnimations,
  keyframes,
  presets: animationPresets,
  duration: ANIMATION_DURATION,
  easing: ANIMATION_EASING,
} as const;
