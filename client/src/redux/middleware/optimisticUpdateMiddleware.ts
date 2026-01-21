import { Middleware, AnyAction } from '@reduxjs/toolkit';

interface OptimisticAction extends AnyAction {
  meta?: {
    optimistic?: {
      id: string;
      type: 'message' | 'reaction' | 'edit' | 'delete';
      data: any;
      rollback: () => AnyAction;
    };
  };
}

/**
 * Optimistic Update Middleware
 * 
 * This middleware handles optimistic updates for chat operations.
 * Note: The chatSlice already has optimistic updates built into the thunks,
 * so this middleware is currently simplified and may be expanded in the future.
 * 
 * Flow:
 * 1. Detect optimistic action (has meta.optimistic)
 * 2. Apply optimistic update immediately
 * 3. Track pending operation
 * 4. On success: confirm update, remove from pending
 * 5. On failure: rollback to previous state
 */
export const optimisticUpdateMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  const typedAction = action as AnyAction;
  
  // Check if this is an optimistic action
  if ('meta' in typedAction && typedAction.meta?.optimistic) {
    const optimistic = (typedAction as OptimisticAction).meta?.optimistic;
    if (!optimistic) {
      return next(typedAction);
    }
    const { id, type, data, rollback } = optimistic;
    
    // Apply optimistic update immediately
    const optimisticAction = getOptimisticAction(type, id, data);
    if (optimisticAction) {
      store.dispatch(optimisticAction);
    }
    
    // Continue with the original async action
    const result = next(typedAction);
    
    return result;
  }
  
  // Handle success/failure of async operations
  if (typedAction.type?.endsWith('/fulfilled')) {
    handleFulfilledAction(store, typedAction);
  } else if (typedAction.type?.endsWith('/rejected')) {
    handleRejectedAction(store, typedAction);
  }
  
  return next(typedAction);
};

/**
 * Get the appropriate optimistic action based on operation type
 */
function getOptimisticAction(type: string, id: string, data: any): AnyAction | null {
  switch (type) {
    case 'message':
      return {
        type: 'chat/addMessage',
        payload: {
          roomId: data.roomId,
          message: {
            id,
            content: { text: data.content },
            type: data.type || 'TEXT',
            roomId: data.roomId,
            authorId: data.authorId || 'current-user',
            isEdited: false,
            reactions: [],
            attachments: [],
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };
    
    case 'reaction':
      return {
        type: 'chat/updateMessage',
        payload: {
          roomId: data.roomId,
          messageId: data.messageId,
          updates: {
            reactions: [
              {
                emoji: data.emoji,
                userId: data.userId,
                createdAt: new Date(),
              },
            ],
          },
        },
      };
    
    case 'edit':
      return {
        type: 'chat/updateMessage',
        payload: {
          roomId: data.roomId,
          messageId: id,
          updates: {
            content: { text: data.content },
            isEdited: true,
            editedAt: new Date(),
          },
        },
      };
    
    case 'delete':
      return {
        type: 'chat/removeMessage',
        payload: {
          roomId: data.roomId,
          messageId: id,
        },
      };
    
    default:
      return null;
  }
}

/**
 * Handle successful async operations
 */
function handleFulfilledAction(store: any, action: AnyAction) {
  // The chatSlice thunks handle their own optimistic updates
  // This is a placeholder for future expansion
}

/**
 * Handle failed async operations
 */
function handleRejectedAction(store: any, action: AnyAction) {
  // The chatSlice thunks handle their own rollback logic
  // This is a placeholder for future expansion
}

/**
 * Confirm optimistic update with real data from server
 */
function confirmOptimisticUpdate(store: any, op: any, payload: any) {
  // The chatSlice thunks handle their own confirmation logic
  // This is a placeholder for future expansion
}

export default optimisticUpdateMiddleware;
