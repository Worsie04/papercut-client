'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  avatar: string | null;
  phone: string | null;
} | null;

interface LoginResponse {
  accessToken: string;
  user: User;
  requiresTwoFactor?: boolean;
}

export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, twoFactorToken?: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}>({
  user: null,
  loading: true,
  login: async () => ({ accessToken: '', user: {} as User }),
  logout: async () => {},
  refreshToken: async () => null,
});

// Debug environment variable
console.log('AuthContext NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://papercut-backend-container.ambitiousmoss-ff53d51e.centralus.azurecontainerapps.io/api/v1';

console.log('AuthContext API_URL final value:', API_URL);
// Token refresh interval (15 minutes)
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup token refresh mechanism
  useEffect(() => {
    // Only start the refresh timer if a user is logged in
    if (!user) return;
    
    // Function to refresh the token
    const refreshAuthToken = async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
    };
    
    // Set up periodic refresh
    const refreshInterval = setInterval(refreshAuthToken, TOKEN_REFRESH_INTERVAL);
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, [user]);

  // Listen for auth success events from login component
  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent) => {
      console.log('Auth success event received:', event.detail);
      const { user: newUser } = event.detail;
      if (newUser) {
        setUser(newUser);
        setLoading(false);
      }
    };

    window.addEventListener('auth-success', handleAuthSuccess as EventListener);
    
    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess as EventListener);
    };
  }, []);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking authentication status...');
      console.log('Current cookies:', document.cookie);
      
      // Check for both httpOnly cookie and localStorage token
      const localToken = localStorage.getItem('access_token_w');
      console.log('Local storage token:', localToken ? 'exists' : 'missing');
      
      // Try auth verify with longer timeout for production
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/auth/verify`, {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Include Authorization header if we have a local token
          ...(localToken && { 'Authorization': `Bearer ${localToken}` })
        }
      });
      
      clearTimeout(timeoutId);
  
      if (response.ok) {
        const data = await response.json();
        console.log('Auth check response:', data);
        
        if (data.user) {
          console.log('User authenticated:', data.user.email);
          setUser(data.user);
          
          // Token refresh zamanını izləmək
          const lastRefresh = new Date();
          localStorage.setItem('lastTokenRefresh', lastRefresh.toISOString());
        } else {
          console.warn('Auth check: User data missing in response');
          setUser(null);
          // Cookie və localStorage təmizləmə
          Cookies.remove('access_token_w', { 
            path: '/',
            domain: window.location.hostname.includes('localhost') ? 'localhost' : undefined 
          });
          localStorage.removeItem('access_token_w');
        }
      } else {
        console.error('Authentication check failed with status:', response.status);
        // Response-u da loglayın
        const errorText = await response.text();
        console.error('Auth check error response:', errorText);
        
        // Cookie və localStorage təmizləmə
        Cookies.remove('access_token_w', { 
          path: '/',
          domain: window.location.hostname.includes('localhost') ? 'localhost' : undefined 
        });
        localStorage.removeItem('access_token_w');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed with exception:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Auth check timed out');
      }
      Cookies.remove('access_token_w');
      localStorage.removeItem('access_token_w');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      console.log('Refreshing authentication token...');
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include', // Important for sending cookies
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Token refresh successful');
        
        // Update client-side cookie
        if (data.accessToken) {
          // Cookies.set('access_token_w', data.accessToken, { 
          //   secure: process.env.NODE_ENV === 'production',
          //   sameSite: 'lax',
          //   expires: 1 // 1 day
          // });

          Cookies.set('access_token_w', data.accessToken, { 
            secure: true, // Həmişə true olsun
            sameSite: 'none', // Production-da cross-domain üçün 'none' olmalıdır
            expires: 1, // 1 gün
            domain: window.location.hostname.includes('localhost') ? 'localhost' : undefined
          });
        }
        
        return data.accessToken;
      } else {
        console.log('Token refresh failed with status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  };

  const login = async (email: string, password: string, twoFactorToken?: string): Promise<LoginResponse> => {
    try {
      console.log(`Attempting login for: ${email}, with 2FA: ${!!twoFactorToken}`);
      
      const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
        email,
        password,
        twoFactorToken,
      }, {
        withCredentials: true, // Important for cookies
      });

      const { data } = response;
      
      console.log('Login response received:', { 
        success: true, 
        requiresTwoFactor: data.requiresTwoFactor,
        hasUser: !!data.user
      });

      if (!data.requiresTwoFactor) {
        // The HTTP-only cookie is already set by the server
        // Store a non-HTTP version for client-side detection of login status
        // Cookies.set('access_token_w', data.accessToken, { 
        //   secure: process.env.NODE_ENV === 'production',
        //   sameSite: 'lax', // More compatible than strict
        //   expires: 1 // 1 day
        // });

        Cookies.set('access_token_w', data.accessToken, { 
          secure: true, // Həmişə true olsun
          sameSite: 'none', // Production-da cross-domain üçün 'none' olmalıdır
          expires: 1, // 1 gün
          domain: window.location.hostname.includes('localhost') ? 'localhost' : undefined
        });
        
        setUser(data.user);
        await checkAuth(); // Verify the token immediately
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      // Call the server logout endpoint
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Important for sending cookies
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      // Clear client-side cookies
      Cookies.remove('access_token_w');
      
      // Update state
      setUser(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server logout fails, clear cookies locally
      Cookies.remove('access_token_w');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}