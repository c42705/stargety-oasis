import React, { useState, useCallback, useEffect } from 'react';
import { Star, ChevronUp, ChevronDown, AlertTriangle, Eye, EyeOff, Rocket, Lightbulb } from 'lucide-react';
import { useAuth } from '../../shared/AuthContext';
import './LoginModule.css';

interface LoginModuleProps {
  className?: string;
}

interface FormData {
  username: string;
  password: string;
  roomId: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  roomId?: string;
  general?: string;
}

export const LoginModule: React.FC<LoginModuleProps> = ({ className = '' }) => {
  const { login, isLoading, rememberUsername, setRememberUsername, savedUsername } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    username: savedUsername || '',
    password: '',
    roomId: 'general',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  // Test accounts for easy access
  const testAccounts = [
    { username: 'admin', password: 'admin123', type: 'Admin User', description: 'Full access to all features including settings' },
    { username: 'john.doe', password: 'user123', type: 'Regular User', description: 'Standard user with chat, video, and world access' },
    { username: 'jane.smith', password: 'user456', type: 'Regular User', description: 'Another standard user for testing collaboration' },
    { username: 'mike.admin', password: 'admin789', type: 'Admin User', description: 'Another admin account for testing admin features' },
  ];

  // Update username when savedUsername changes
  useEffect(() => {
    if (savedUsername && !formData.username) {
      setFormData(prev => ({ ...prev, username: savedUsername }));
    }
  }, [savedUsername, formData.username]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.trim().length < 2) {
      newErrors.username = 'Username must be at least 2 characters';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.trim().length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }

    if (!formData.roomId.trim()) {
      newErrors.roomId = 'Room ID cannot be empty';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.roomId.trim())) {
      newErrors.roomId = 'Room ID can only contain letters, numbers, dots, hyphens, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Clear general error
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  }, [errors]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const success = await login(
        formData.username.trim(),
        formData.password.trim(),
        formData.roomId.trim()
      );

      if (!success) {
        setErrors({ general: 'Invalid username or password. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: 'Login failed. Please try again later.' });
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, login, validateForm]);

  // Quick login with test account
  const handleQuickLogin = useCallback((testAccount: typeof testAccounts[0]) => {
    setFormData({
      username: testAccount.username,
      password: testAccount.password,
      roomId: 'general',
    });
    setErrors({});
    // Collapse the test accounts section after selection
    setShowTestAccounts(false);
  }, []);

  // Handle remember username toggle
  const handleRememberUsernameChange = useCallback((checked: boolean) => {
    setRememberUsername(checked);
  }, [setRememberUsername]);

  return (
    <div className={`login-module ${className}`}>
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <div className="logo">
            <div className="logo-icon">
              <Star size={32} />
            </div>
            <h1>Stargety Oasis</h1>
          </div>
          <p className="tagline">Your collaborative digital workspace</p>
        </div>

        {/* Test Accounts Section */}
        <div className="test-accounts-section">
          <button
            type="button"
            className="test-accounts-toggle"
            onClick={() => setShowTestAccounts(!showTestAccounts)}
            disabled={isSubmitting || isLoading}
          >
            {showTestAccounts ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )} Demo Accounts
          </button>

          {showTestAccounts && (
            <div className="test-accounts-list">
              <p className="test-accounts-description">
                Quick login with pre-configured test accounts:
              </p>
              {testAccounts.map((account, index) => (
                <div key={index} className="test-account-item">
                  <div className="test-account-info">
                    <div className="test-account-header">
                      <span className="test-account-username">{account.username}</span>
                      <span className={`test-account-type ${account.type.includes('Admin') ? 'admin' : 'user'}`}>
                        {account.type}
                      </span>
                    </div>
                    <div className="test-account-description">{account.description}</div>
                    <div className="test-account-credentials">
                      Password: <code>{account.password}</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="quick-login-button"
                    onClick={() => handleQuickLogin(account)}
                    disabled={isSubmitting || isLoading}
                  >
                    Use Account
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Welcome Back</h2>
          <p className="form-subtitle">Sign in to access your workspace</p>

          {/* General Error */}
          {errors.general && (
            <div className="error-message general-error">
              <span className="error-icon">
                <AlertTriangle size={16} />
              </span>
              {errors.general}
            </div>
          )}

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
              <span className="required">*</span>
            </label>
            <input
              id="username"
              type="text"
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isSubmitting || isLoading}
              autoComplete="username"
            />
            {errors.username && (
              <div className="error-message">
                <span className="error-icon">
                  <AlertTriangle size={16} />
                </span>
                {errors.username}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
              <span className="required">*</span>
            </label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isSubmitting || isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting || isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
            {errors.password && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {errors.password}
              </div>
            )}
          </div>

          {/* Room ID Field */}
          <div className="form-group">
            <label htmlFor="roomId" className="form-label">
              Room ID
              <span className="optional">(optional)</span>
            </label>
            <input
              id="roomId"
              type="text"
              className={`form-input ${errors.roomId ? 'error' : ''}`}
              placeholder="general"
              value={formData.roomId}
              onChange={(e) => handleInputChange('roomId', e.target.value)}
              disabled={isSubmitting || isLoading}
              autoComplete="off"
            />
            <div className="field-hint">
              Leave empty or use "general" for the default room
            </div>
            {errors.roomId && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {errors.roomId}
              </div>
            )}
          </div>

          {/* Remember Username */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberUsername}
                onChange={(e) => handleRememberUsernameChange(e.target.checked)}
                disabled={isSubmitting || isLoading}
              />
              <span className="checkbox-custom"></span>
              Remember my username
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              <>
                <Rocket size={16} /> Sign In
              </>
            )}
          </button>
        </form>


        {/* Footer */}
        <div className="login-footer">
          <p>
            <Lightbulb size={16} className="demo-icon" /> <strong>Demo Mode:</strong> Any username/password combination works,
            or use the demo accounts above for testing specific features.
          </p>
        </div>
      </div>
    </div>
  );
};
