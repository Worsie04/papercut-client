'use client';
import React , { useState, useEffect } from 'react';
import DashboardPaperCut from '@/components/DashboardPaperCut';
import UploadAndSignPdf from '@/components/UploadFilesPaperCut';
import ApprovalsPaperCut from '@/components/ApprovalsPaperCut';
import LayoutDebugger from '@/components/LayoutDebugger';
import AuthDebugger from '@/components/AuthDebugger';
import { getCurrentUser, User } from '@/utils/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

const PaperCutHomeLayout = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<{
    authContextUser: string | null;
    authContextLoading: boolean;
    apiUser: string | null;
    timestamp: string;
  }>({
    authContextUser: null,
    authContextLoading: true,
    apiUser: null,
    timestamp: new Date().toISOString()
  });
  
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Monitor auth state changes
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      authContextUser: authUser ? `${authUser.firstName} ${authUser.lastName}` : null,
      authContextLoading: authLoading,
      timestamp: new Date().toISOString()
    }));
  }, [authUser, authLoading]);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      // If auth context is still loading, wait
      if (authLoading) return;
      
      // If no user in auth context, redirect to login
      if (!authUser) {
        console.log('No authenticated user found, redirecting to login');
        router.push('/login');
        return;
      }

      try {
        console.log('Fetching current user data...');
        const user = await getCurrentUser();
        setCurrentUser(user);
        setDebugInfo(prev => ({
          ...prev,
          apiUser: user ? `${user.firstName} ${user.lastName}` : null
        }));
        console.log('Dashboard loaded successfully for user:', user.email);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        // If API call fails, try to use auth context user
        if (authUser) {
          setCurrentUser(authUser as unknown as User);
          setDebugInfo(prev => ({
            ...prev,
            apiUser: 'API failed, using auth context'
          }));
        } else {
          // If both fail, redirect to login
          router.push('/login');
        }
      } finally {
        setDashboardLoading(false);
      }
    };

    checkAuthentication();
  }, [authUser, authLoading, router]);

  // Show loading while authentication is being verified
  if (authLoading || dashboardLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
          {/* Debug info for production troubleshooting */}
          <div className="mt-4 text-xs text-gray-400">
            <div>Auth Loading: {authLoading.toString()}</div>
            <div>Dashboard Loading: {dashboardLoading.toString()}</div>
            <div>Auth User: {debugInfo.authContextUser || 'None'}</div>
            <div>API User: {debugInfo.apiUser || 'None'}</div>
            <div>Timestamp: {debugInfo.timestamp}</div>
          </div>
        </div>
      </div>
    );
  }

  return (    
        <div className="p-6">
          {/* Temporary debug components - remove after testing */}
          <LayoutDebugger />
          <AuthDebugger />
          
          <h2 className="text-2xl font-semibold mb-4">
            Hello, {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}
          </h2>
          <DashboardPaperCut />
          <UploadAndSignPdf />
          <div className="flex mt-6 gap-4">
            <ApprovalsPaperCut className="flex-1" />
          </div>
        </div>      
  );
};

export default PaperCutHomeLayout;

// Add this debugging div to your dashboard page temporarily
<div style={{ 
  position: 'fixed', 
  top: '10px', 
  right: '10px', 
  background: '#f0f0f0', 
  padding: '10px', 
  borderRadius: '5px', 
  fontSize: '12px',
  zIndex: 10000 
}}>
  <div>Body Width: {typeof window !== 'undefined' ? document.body.offsetWidth : 'Loading...'}px</div>
  <div>Window Width: {typeof window !== 'undefined' ? window.innerWidth : 'Loading...'}px</div>
  <div>Scroll Width: {typeof window !== 'undefined' ? document.body.scrollWidth : 'Loading...'}px</div>
</div>
