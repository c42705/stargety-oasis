/**
 * Chat Animation Utilities
 * 
 * Provides animation utilities for chat components
 * Includes message animations, transitions, and micro-interactions
 */

// Animation keyframes as CSS strings
export const messageSlideIn = `
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const messageFadeIn = `
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const messageScaleIn = `
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const messageSlideOut = `
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-100%);
  }
`;

export const messageFadeOut = `
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

export const reactionPop = `
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

export const reactionBounce = `
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
`;

export const typingDot = `
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
`;

export const uploadProgress = `
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
`;

export const uploadComplete = `
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

export const threadExpand = `
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 1000px;
    opacity: 1;
  }
`;

export const threadCollapse = `
  from {
    max-height: 1000px;
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
`;

export const searchHighlight = `
  0%, 100% {
    background-color: rgba(24, 144, 255, 0.2);
  }
  50% {
    background-color: rgba(24, 144, 255, 0.4);
  }
`;

export const notificationSlideIn = `
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const notificationSlideOut = `
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

export const pulse = `
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

export const shake = `
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-5px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(5px);
  }
`;

// Animation durations
export const animationDurations = {
  fast: '0.15s',
  normal: '0.3s',
  slow: '0.5s',
  verySlow: '0.8s',
} as const;

// Animation timing functions
export const animationEasing = {
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// Animation utilities
export const getAnimationStyle = (
  keyframes: string,
  duration: keyof typeof animationDurations = 'normal',
  easing: keyof typeof animationEasing = 'easeOut'
) => ({
  animation: `${keyframes} ${animationDurations[duration]} ${animationEasing[easing]}`,
});

export const getTransitionStyle = (
  property: string,
  duration: keyof typeof animationDurations = 'normal',
  easing: keyof typeof animationEasing = 'easeOut'
) => ({
  transition: `${property} ${animationDurations[duration]} ${animationEasing[easing]}`,
});

// Preset animation styles
export const animationStyles = {
  messageEntry: getAnimationStyle(messageSlideIn, 'normal', 'easeOut'),
  messageExit: getAnimationStyle(messageSlideOut, 'fast', 'easeIn'),
  reactionEntry: getAnimationStyle(reactionPop, 'fast', 'bounce'),
  threadExpand: getAnimationStyle(threadExpand, 'normal', 'easeOut'),
  threadCollapse: getAnimationStyle(threadCollapse, 'fast', 'easeIn'),
  notificationEntry: getAnimationStyle(notificationSlideIn, 'normal', 'spring'),
  notificationExit: getAnimationStyle(notificationSlideOut, 'fast', 'easeIn'),
  typingIndicator: getAnimationStyle(typingDot, 'verySlow', 'easeInOut'),
  uploadProgress: getAnimationStyle(uploadProgress, 'slow', 'easeOut'),
  uploadComplete: getAnimationStyle(uploadComplete, 'normal', 'bounce'),
  searchHighlight: getAnimationStyle(searchHighlight, 'slow', 'easeInOut'),
  pulse: getAnimationStyle(pulse, 'slow', 'easeInOut'),
  shake: getAnimationStyle(shake, 'normal', 'easeInOut'),
} as const;

// Transition styles
export const transitionStyles = {
  hover: getTransitionStyle('all', 'fast', 'easeOut'),
  focus: getTransitionStyle('box-shadow', 'fast', 'easeOut'),
  modal: getTransitionStyle('opacity', 'normal', 'easeInOut'),
  slide: getTransitionStyle('transform', 'normal', 'easeOut'),
  fade: getTransitionStyle('opacity', 'normal', 'easeOut'),
  scale: getTransitionStyle('transform', 'fast', 'bounce'),
} as const;

// Animation utilities for specific use cases
export const getMessageAnimation = (isNew: boolean) => 
  isNew ? animationStyles.messageEntry : undefined;

export const getReactionAnimation = (isAdded: boolean) => 
  isAdded ? animationStyles.reactionEntry : undefined;

export const getThreadAnimation = (isExpanded: boolean) => 
  isExpanded ? animationStyles.threadExpand : animationStyles.threadCollapse;

export const getNotificationAnimation = (isVisible: boolean) => 
  isVisible ? animationStyles.notificationEntry : animationStyles.notificationExit;

export const getUploadAnimation = (isComplete: boolean) => 
  isComplete ? animationStyles.uploadComplete : animationStyles.uploadProgress;

// Animation hooks (to be used with React components)
export const useAnimation = (keyframes: string, trigger: boolean) => {
  return trigger ? getAnimationStyle(keyframes) : {};
};

export const useTransition = (property: string, trigger: boolean) => {
  return trigger ? getTransitionStyle(property) : {};
};
