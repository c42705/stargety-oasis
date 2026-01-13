/**
 * Animation Utilities for Chat System
 * Provides smooth transitions, animations, and motion effects
 */

import { reducedMotion } from './accessibility';

/**
 * Animation duration constants (in milliseconds)
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800,
} as const;

/**
 * Animation easing functions
 */
export const ANIMATION_EASING = {
  LINEAR: 'linear',
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  CUBIC_BEZIER: 'cubic-bezier(0.4, 0, 0.2, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

/**
 * Animation types
 */
export const ANIMATION_TYPE = {
  FADE_IN: 'fadeIn',
  FADE_OUT: 'fadeOut',
  SLIDE_IN: 'slideIn',
  SLIDE_OUT: 'slideOut',
  SCALE_IN: 'scaleIn',
  SCALE_OUT: 'scaleOut',
  BOUNCE_IN: 'bounceIn',
  BOUNCE_OUT: 'bounceOut',
  ROTATE_IN: 'rotateIn',
  ROTATE_OUT: 'rotateOut',
  FLIP_IN: 'flipIn',
  FLIP_OUT: 'flipOut',
} as const;

/**
 * Get animation duration based on reduced motion preference
 */
export const getAnimationDuration = (duration: number): number => {
  return reducedMotion.getDuration(duration);
};

/**
 * Get CSS transition string
 */
export const getTransition = (
  properties: string | string[],
  duration: number = ANIMATION_DURATION.NORMAL,
  easing: string = ANIMATION_EASING.CUBIC_BEZIER
): string => {
  const props = Array.isArray(properties) ? properties.join(', ') : properties;
  const actualDuration = getAnimationDuration(duration);
  return `${props} ${actualDuration}ms ${easing}`;
};

/**
 * Get CSS animation string
 */
export const getAnimation = (
  name: string,
  duration: number = ANIMATION_DURATION.NORMAL,
  easing: string = ANIMATION_EASING.CUBIC_BEZIER,
  delay: number = 0,
  iterationCount: number | string = 1,
  direction: string = 'normal',
  fillMode: string = 'both'
): string => {
  const actualDuration = getAnimationDuration(duration);
  return `${name} ${actualDuration}ms ${easing} ${delay}ms ${iterationCount} ${direction} ${fillMode}`;
};

/**
 * Fade in animation keyframes
 */
export const fadeInKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/**
 * Fade out animation keyframes
 */
export const fadeOutKeyframes = `
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;

/**
 * Slide in from top animation keyframes
 */
export const slideInTopKeyframes = `
  @keyframes slideInTop {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

/**
 * Slide in from bottom animation keyframes
 */
export const slideInBottomKeyframes = `
  @keyframes slideInBottom {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

/**
 * Slide in from left animation keyframes
 */
export const slideInLeftKeyframes = `
  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

/**
 * Slide in from right animation keyframes
 */
export const slideInRightKeyframes = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

/**
 * Scale in animation keyframes
 */
export const scaleInKeyframes = `
  @keyframes scaleIn {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

/**
 * Scale out animation keyframes
 */
export const scaleOutKeyframes = `
  @keyframes scaleOut {
    from {
      transform: scale(1);
      opacity: 1;
    }
    to {
      transform: scale(0.8);
      opacity: 0;
    }
  }
`;

/**
 * Bounce in animation keyframes
 */
export const bounceInKeyframes = `
  @keyframes bounceIn {
    0% {
      transform: scale(0.3);
      opacity: 0;
    }
    50% {
      transform: scale(1.05);
      opacity: 1;
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }
`;

/**
 * Rotate in animation keyframes
 */
export const rotateInKeyframes = `
  @keyframes rotateIn {
    from {
      transform: rotate(-180deg) scale(0.8);
      opacity: 0;
    }
    to {
      transform: rotate(0) scale(1);
      opacity: 1;
    }
  }
`;

/**
 * Flip in animation keyframes
 */
export const flipInKeyframes = `
  @keyframes flipIn {
    from {
      transform: perspective(400px) rotateY(90deg);
      opacity: 0;
    }
    to {
      transform: perspective(400px) rotateY(0);
      opacity: 1;
    }
  }
`;

/**
 * Message appear animation keyframes
 */
export const messageAppearKeyframes = `
  @keyframes messageAppear {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

/**
 * Typing indicator animation keyframes
 */
export const typingIndicatorKeyframes = `
  @keyframes typingBounce {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-4px);
    }
  }
`;

/**
 * Reaction pop animation keyframes
 */
export const reactionPopKeyframes = `
  @keyframes reactionPop {
    0% {
      transform: scale(0);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }
`;

/**
 * Notification slide animation keyframes
 */
export const notificationSlideKeyframes = `
  @keyframes notificationSlide {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

/**
 * Thread expand animation keyframes
 */
export const threadExpandKeyframes = `
  @keyframes threadExpand {
    from {
      max-height: 0;
      opacity: 0;
    }
    to {
      max-height: 1000px;
      opacity: 1;
    }
  }
`;

/**
 * Get animation class name
 */
export const getAnimationClass = (type: string, direction?: string): string => {
  const directionMap: Record<string, string> = {
    top: 'Top',
    bottom: 'Bottom',
    left: 'Left',
    right: 'Right',
  };

  const dir = direction ? directionMap[direction] || '' : '';
  return `${type}${dir}`;
};

/**
 * Animation styles object for inline styles
 */
export const animationStyles = {
  fadeIn: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('fadeIn', duration),
  }),
  fadeOut: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('fadeOut', duration),
  }),
  slideIn: (
    direction: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
    duration: number = ANIMATION_DURATION.NORMAL
  ) => ({
    animation: getAnimation(`slideIn${direction.charAt(0).toUpperCase() + direction.slice(1)}`, duration),
  }),
  scaleIn: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('scaleIn', duration),
  }),
  bounceIn: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('bounceIn', duration, ANIMATION_EASING.BOUNCE),
  }),
  rotateIn: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('rotateIn', duration),
  }),
  messageAppear: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('messageAppear', duration),
  }),
  reactionPop: (duration: number = ANIMATION_DURATION.FAST) => ({
    animation: getAnimation('reactionPop', duration, ANIMATION_EASING.BOUNCE),
  }),
  notificationSlide: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('notificationSlide', duration),
  }),
  threadExpand: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    animation: getAnimation('threadExpand', duration),
  }),
};

/**
 * Transition styles object for inline styles
 */
export const transitionStyles = {
  fade: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    transition: getTransition('opacity', duration),
  }),
  slide: (
    property: 'transform' | 'transform, opacity' = 'transform, opacity',
    duration: number = ANIMATION_DURATION.NORMAL
  ) => ({
    transition: getTransition(property, duration),
  }),
  scale: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    transition: getTransition('transform', duration),
  }),
  all: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    transition: getTransition('all', duration),
  }),
  color: (duration: number = ANIMATION_DURATION.NORMAL) => ({
    transition: getTransition('color, background-color, border-color', duration),
  }),
};

/**
 * Staggered animation delay generator
 */
export const getStaggeredDelay = (index: number, baseDelay: number = 50): number => {
  return index * baseDelay;
};

/**
 * Get staggered animation style
 */
export const getStaggeredAnimation = (
  index: number,
  animationName: string,
  baseDelay: number = 50,
  duration: number = ANIMATION_DURATION.NORMAL
) => {
  const delay = getStaggeredDelay(index, baseDelay);
  return {
    animation: getAnimation(animationName, duration, ANIMATION_EASING.CUBIC_BEZIER, delay),
  };
};

/**
 * Spring animation parameters
 */
export const springAnimation = {
  stiffness: 300,
  damping: 30,
  mass: 1,
};

/**
 * Get spring transition string
 */
export const getSpringTransition = (property: string = 'all'): string => {
  const { stiffness, damping, mass } = springAnimation;
  return `${property} ${mass}s cubic-bezier(${stiffness / 1000}, ${damping / 1000}, ${stiffness / 1000}, 1)`;
};

/**
 * Animation utilities for specific chat components
 */
export const chatAnimations = {
  /**
   * Message list item animation
   */
  messageItem: (index: number) => ({
    animation: getAnimation(
      'messageAppear',
      ANIMATION_DURATION.NORMAL,
      ANIMATION_EASING.CUBIC_BEZIER,
      getStaggeredDelay(index, 30)
    ),
  }),

  /**
   * Typing indicator dot animation
   */
  typingDot: (index: number) => ({
    animation: getAnimation(
      'typingBounce',
      600,
      'ease-in-out',
      index * 100,
      'infinite'
    ),
  }),

  /**
   * Reaction button animation
   */
  reactionButton: () => ({
    transition: getTransition('transform, background-color', ANIMATION_DURATION.FAST),
    '&:hover': {
      transform: 'scale(1.1)',
    },
    '&:active': {
      transform: 'scale(0.95)',
    },
  }),

  /**
   * File upload progress animation
   */
  uploadProgress: (progress: number) => ({
    transition: getTransition('width', ANIMATION_DURATION.NORMAL),
    width: `${progress}%`,
  }),

  /**
   * Thread expand/collapse animation
   */
  threadToggle: (isExpanded: boolean) => ({
    maxHeight: isExpanded ? '1000px' : '0',
    opacity: isExpanded ? 1 : 0,
    transition: getTransition('max-height, opacity', ANIMATION_DURATION.NORMAL),
    overflow: 'hidden',
  }),

  /**
   * Search result highlight animation
   */
  searchHighlight: () => ({
    animation: getAnimation('fadeIn', ANIMATION_DURATION.FAST),
    backgroundColor: 'rgba(24, 144, 255, 0.2)',
  }),

  /**
   * Notification animation
   */
  notification: () => ({
    animation: getAnimation('notificationSlide', ANIMATION_DURATION.NORMAL),
  }),

  /**
   * Modal backdrop animation
   */
  modalBackdrop: () => ({
    animation: getAnimation('fadeIn', ANIMATION_DURATION.NORMAL),
  }),

  /**
   * Modal content animation
   */
  modalContent: () => ({
    animation: getAnimation('scaleIn', ANIMATION_DURATION.NORMAL),
  }),
};

/**
 * Generate CSS keyframes string for all animations
 */
export const getAllKeyframes = (): string => {
  return `
    ${fadeInKeyframes}
    ${fadeOutKeyframes}
    ${slideInTopKeyframes}
    ${slideInBottomKeyframes}
    ${slideInLeftKeyframes}
    ${slideInRightKeyframes}
    ${scaleInKeyframes}
    ${scaleOutKeyframes}
    ${bounceInKeyframes}
    ${rotateInKeyframes}
    ${flipInKeyframes}
    ${messageAppearKeyframes}
    ${typingIndicatorKeyframes}
    ${reactionPopKeyframes}
    ${notificationSlideKeyframes}
    ${threadExpandKeyframes}
  `;
};

/**
 * Check if animations are enabled
 */
export const areAnimationsEnabled = (): boolean => {
  return !reducedMotion.isPreferred();
};

/**
 * Get conditional animation style
 */
export const getConditionalAnimation = (
  enabled: boolean,
  animationStyle: React.CSSProperties
): React.CSSProperties => {
  return enabled ? animationStyle : {};
};
