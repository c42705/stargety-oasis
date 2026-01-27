import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logger } from './logger';
import { API_CONFIG } from './constants';

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  roomId: string;       // Legacy chat room ID
  worldRoomId: string;  // World room ID for multiplayer (e.g., 'Stargety-Oasis-1')
  isAdmin: boolean;
  loginTime: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  pendingUserId: string | null;
  pendingTopicId: string | null;
  login: (username: string, password: string, worldRoomId?: string) => Promise<boolean>;
  verify2FA: (code: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  rememberUsername: boolean;
  setRememberUsername: (remember: boolean) => void;
  savedUsername: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const SESSION_STORAGE_KEY = 'stargetyOasisAuth';
const USERNAME_STORAGE_KEY = 'stargetyOasisRememberedUsername';
const PENDING_USER_KEY = 'stargetyOasisPendingUser';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingTopicId, setPendingTopicId] = useState<string | null>(null);
  const [rememberUsername, setRememberUsername] = useState(false);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);

  // Check if user is admin based on username
  const isAdminUser = useCallback((username: string): boolean => {
    return username.toLowerCase().includes('admin') ||
           username.toLowerCase() === 'administrator' ||
           username.toLowerCase() === 'root';
  }, []);

  // Load saved authentication state on mount
  useEffect(() => {
    try {
      // Check for existing session
      const savedAuth = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        setUser({
          ...authData,
          loginTime: new Date(authData.loginTime),
        });
      }

      // Load remembered username
      const rememberedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
      if (rememberedUsername) {
        setSavedUsername(rememberedUsername);
        setRememberUsername(true);
      }
    } catch (error) {
      console.error('Failed to load authentication state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function - initiates 2FA flow
  const login = useCallback(async (username: string, password: string, worldRoomId: string = 'Stargety-Oasis-1'): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        logger.error('Login failed', { error: data.error });
        return false;
      }

      // Store pending user for 2FA verification
      setPendingUserId(data.data.userId);
      setPendingTopicId(data.data.ntfy_topic_id || null);
      setRequires2FA(true);
      sessionStorage.setItem(PENDING_USER_KEY, JSON.stringify({
        userId: data.data.userId,
        username,
        worldRoomId,
        topicId: data.data.ntfy_topic_id,
      }));

      logger.info('Login initiated, awaiting 2FA verification', { topicId: data.data.ntfy_topic_id });
      return true;
    } catch (error) {
      logger.error('Login error', { error });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify 2FA code
  const verify2FA = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      if (!pendingUserId) {
        logger.error('No pending user for 2FA verification');
        return false;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId, code }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        logger.error('2FA verification failed', { error: data.error });
        return false;
      }

      // Get pending user info
      const pendingData = sessionStorage.getItem(PENDING_USER_KEY);
      const { username, worldRoomId } = pendingData ? JSON.parse(pendingData) : { username: data.data.username, worldRoomId: 'Stargety-Oasis-1' };

      // Create authenticated user
      const newUser: User = {
        id: data.data.userId,
        username: data.data.username,
        email: data.data.email,
        displayName: data.data.username,
        roomId: 'general',
        worldRoomId: worldRoomId || 'Stargety-Oasis-1',
        isAdmin: isAdminUser(data.data.username),
        loginTime: new Date(),
      };

      setUser(newUser);
      setRequires2FA(false);
      setPendingUserId(null);
      sessionStorage.removeItem(PENDING_USER_KEY);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));

      logger.info('User authenticated successfully');
      return true;
    } catch (error) {
      logger.error('2FA verification error', { error });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pendingUserId, isAdminUser]);

  // Register function
  const register = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        logger.error('Registration failed', { error: data.error });
        return false;
      }

      logger.info('Registration successful', { userId: data.data.userId });
      return true;
    } catch (error) {
      logger.error('Registration error', { error });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Request password reset
  const requestPasswordReset = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        logger.error('Password reset request failed', { error: data.error });
        return { success: false, error: data.error || 'Failed to request password reset' };
      }

      logger.info('Password reset requested');
      return { success: true };
    } catch (error) {
      logger.error('Password reset request error', { error });
      return { success: false, error: 'An error occurred while requesting password reset' };
    }
  }, []);

  // Reset password with token
  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        logger.error('Password reset failed', { error: data.error });
        return { success: false, error: data.error || 'Failed to reset password' };
      }

      logger.info('Password reset successfully');
      return { success: true };
    } catch (error) {
      logger.error('Password reset error', { error });
      return { success: false, error: 'An error occurred while resetting password' };
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setRequires2FA(false);
    setPendingUserId(null);
    setPendingTopicId(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_USER_KEY);
  }, []);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    requires2FA,
    pendingUserId,
    pendingTopicId,
    login,
    verify2FA,
    logout,
    register,
    requestPasswordReset,
    resetPassword,
    rememberUsername,
    setRememberUsername,
    savedUsername,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
