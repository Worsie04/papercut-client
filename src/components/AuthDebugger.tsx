'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Cookies from 'js-cookie';

const AuthDebugger: React.FC = () => {
  const { user, loading } = useAuth();
  const [debugData, setDebugData] = useState({
    cookies: '',
    localStorage: '',
    environment: '',
    currentUrl: '',
    userAgent: '',
    timestamp: new Date().toISOString()
  });

  const updateDebugData = () => {
    if (typeof window !== 'undefined') {
      setDebugData({
        cookies: document.cookie,
        localStorage: localStorage.getItem('access_token_w') || 'none',
        environment: process.env.NODE_ENV || 'unknown',
        currentUrl: window.location.href,
        userAgent: navigator.userAgent.slice(0, 100),
        timestamp: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    updateDebugData();
    
    // Update every 3 seconds
    const interval = setInterval(updateDebugData, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Only show in development or if there's an auth issue
  const shouldShow = process.env.NODE_ENV === 'development' || 
                    (!user && !loading) ||
                    window.location.hostname.includes('render.com') ||
                    window.location.hostname.includes('papercut.website');

  if (!shouldShow) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: user ? '#52c41a' : '#ff4d4f',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '11px',
      zIndex: 10000,
      fontFamily: 'monospace',
      maxWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <div><strong>🔐 Auth Debug</strong></div>
      <hr style={{ margin: '8px 0', border: '1px solid rgba(255,255,255,0.3)' }} />
      
      <div><strong>User:</strong> {user ? `${user.firstName} ${user.lastName}` : 'None'}</div>
      <div><strong>Loading:</strong> {loading.toString()}</div>
      <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
      
      <hr style={{ margin: '8px 0', border: '1px solid rgba(255,255,255,0.3)' }} />
      
      <div><strong>Environment:</strong> {debugData.environment}</div>
      <div><strong>Host:</strong> {window.location.hostname}</div>
      
      <hr style={{ margin: '8px 0', border: '1px solid rgba(255,255,255,0.3)' }} />
      
      <div><strong>Cookies:</strong> {debugData.cookies || 'None'}</div>
      <div><strong>LocalStorage:</strong> {debugData.localStorage}</div>
      
      <hr style={{ margin: '8px 0', border: '1px solid rgba(255,255,255,0.3)' }} />
      
      <div><strong>URL:</strong> {debugData.currentUrl}</div>
      <div><strong>UA:</strong> {debugData.userAgent}...</div>
      <div><strong>Time:</strong> {debugData.timestamp.slice(11, 19)}</div>
      
      <hr style={{ margin: '8px 0', border: '1px solid rgba(255,255,255,0.3)' }} />
      
      <button 
        onClick={() => window.location.reload()} 
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          cursor: 'pointer'
        }}
      >
        🔄 Refresh
      </button>
      
      <button 
        onClick={() => {
          Cookies.remove('access_token_w');
          localStorage.removeItem('access_token_w');
          window.location.href = '/login';
        }} 
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          cursor: 'pointer',
          marginLeft: '5px'
        }}
      >
        🚪 Logout
      </button>
    </div>
  );
};

export default AuthDebugger; 