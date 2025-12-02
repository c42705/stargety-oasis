import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  username: string;
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
  login: (username: string, password: string, roomId?: string) => Promise<boolean>;
  logout: () => void;
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

// Test accounts for demo purposes
const TEST_ACCOUNTS = [
  { username: 'admin', password: 'admin123', displayName: 'Administrator' },
  { username: 'administrator', password: 'admin123', displayName: 'System Administrator' },
  { username: 'john.doe', password: 'user123', displayName: 'John Doe' },
  { username: 'jane.smith', password: 'user456', displayName: 'Jane Smith' },
  { username: 'mike.admin', password: 'admin789', displayName: 'Mike Admin' },
  { username: 'sarah.wilson', password: 'user789', displayName: 'Sarah Wilson' },
];

const SESSION_STORAGE_KEY = 'stargetyOasisAuth';
const USERNAME_STORAGE_KEY = 'stargetyOasisRememberedUsername';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Login function - worldRoomId is used for multiplayer visibility
  const login = useCallback(async (username: string, password: string, worldRoomId: string = 'Stargety-Oasis-1'): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check test accounts first
      const testAccount = TEST_ACCOUNTS.find(
        account => account.username.toLowerCase() === username.toLowerCase() &&
                  account.password === password
      );

      let isValidLogin = false;
      let displayName = username;

      if (testAccount) {
        // Valid test account
        isValidLogin = true;
        displayName = testAccount.displayName;
      } else {
        // For demo purposes, allow any username/password combination
        // In a real app, this would validate against a backend
        isValidLogin = username.trim().length > 0 && password.trim().length > 0;
      }

      if (isValidLogin) {
        const newUser: User = {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          username: username.trim(),
          displayName,
          roomId: 'general', // Legacy chat room
          worldRoomId: worldRoomId || 'Stargety-Oasis-1', // World room for multiplayer
          isAdmin: isAdminUser(username),
          loginTime: new Date(),
        };

        setUser(newUser);

        // Save to session storage
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));

        // Handle remember username
        if (rememberUsername) {
          localStorage.setItem(USERNAME_STORAGE_KEY, username);
          setSavedUsername(username);
        } else {
          localStorage.removeItem(USERNAME_STORAGE_KEY);
          setSavedUsername(null);
        }

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAdminUser, rememberUsername]);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
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
