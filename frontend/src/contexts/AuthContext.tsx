import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface User {
  _id: string;
  name: string;
  email: string;
  balance: number;
  tier: number;
  phone?: string;
  isAdmin?: boolean;
  lvl1anim?: number;
  lvl2anim?: number;
  lvl3anim?: number;
  lvl4anim?: number;
  lvl5anim?: number;
  lvl1reward?: number;
  lvl2reward?: number;
  lvl3reward?: number;
  lvl4reward?: number;
  lvl5reward?: number;
  wallets?: {
    btc?: string;
    eth?: string;
    tron?: string;
    usdtErc20?: string;
    custom?: { chain: string; address: string }[];
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  markAnimationWatched: (level: number) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing token and user data on app load
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Immediately refresh to get latest data from server including level rewards
        setTimeout(() => {
          refreshUserData(storedToken);
        }, 100);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Helper function to refresh user data
  const refreshUserData = async (authToken: string) => {
    try {
      const response = await fetch('/tier/my-tier', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const responseData = await response.json();
      if (response.ok && responseData.success) {
        const apiUser = responseData.data?.user;
        if (apiUser) {
          setUser(prevUser => {
            const merged = { ...prevUser, ...apiUser } as User;
            localStorage.setItem('user', JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/auth/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const { token: newToken, user: userData } = responseData.data;
        
        setToken(newToken);
        setUser(userData);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        toast.success('Login successful!');
        return true;
      } else {
        toast.error(responseData.message || 'Login failed. Please check your credentials.');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login. Please try again.');
      return false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!token) {
      console.log('No token available for refresh');
      return;
    }
    await refreshUserData(token);
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token]);

  useEffect(() => {
    const onFocus = () => { refreshUser(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token]);

  const markAnimationWatched = async (level: number): Promise<boolean> => {
    if (!token) return false;
    try {
      const response = await fetch('/user/mark-animation-watched', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ level }),
      });
      const responseData = await response.json();
      if (response.ok && responseData.success) {
        // Update user in context with new animation flags
        if (user) {
          const updatedUser = { ...user, ...responseData.data };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to mark animation as watched', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading,
    refreshUser,
    markAnimationWatched,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
