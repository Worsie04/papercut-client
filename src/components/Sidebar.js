'use client';
import React, { useState, useEffect, Suspense, lazy, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from 'antd';
import { DoubleRightOutlined, DoubleLeftOutlined, DownOutlined, RightOutlined, StarOutlined, CompassOutlined,HomeOutlined, InboxOutlined, TeamOutlined, SettingOutlined, 
  SearchOutlined, UserAddOutlined, FolderOutlined, ImportOutlined,
  PlusCircleOutlined, EditOutlined, MailOutlined, FolderOpenOutlined, ShareAltOutlined } from '@ant-design/icons';

import '@/styles/Sidebar.css';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL } from '@/app/config';
import axios from 'axios';

const SidebarItem = memo(({ href, icon, label, collapsed }) => {
  const pathname = usePathname();
  return (
    <li className={pathname === href ? 'active' : ''}>
      <Link href={href}>
        {icon}
        <span className={collapsed ? 'hidden' : ''}> {label}</span>
      </Link>
    </li>
  );
});

SidebarItem.displayName = 'SidebarItem';

const getAuthHeaders = () => {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true,
  };
};

// Global function to refresh favorite templates
let refreshFavoritesGlobal = null;

export const refreshFavoriteTemplates = () => {
  if (refreshFavoritesGlobal) {
    refreshFavoritesGlobal();
  }
};

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isFavoriteExpanded, setIsFavoriteExpanded] = useState(true);
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(true);
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(false);
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch favorite templates and determine current user
  const fetchFavoriteTemplates = async () => {
    try {
      setIsLoadingFavorites(true);
      const config = getAuthHeaders();
      const response = await axios.get(`${API_URL}/templates/favorites`, config);
      
      console.log('Favorites API response:', response.data);
      
      if (response.data.success) {
        setFavoriteTemplates(response.data.templates || []);
        // Set current user ID from the API response
        if (response.data.currentUserId) {
          setCurrentUserId(response.data.currentUserId);
          console.log('Current user ID set to:', response.data.currentUserId);
        }
      } else {
        setFavoriteTemplates([]);
      }
      
    } catch (error) {
      console.error('Error fetching favorite templates:', error);
      setFavoriteTemplates([]);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  useEffect(() => {
    fetchFavoriteTemplates();
    
    // Set global refresh function
    refreshFavoritesGlobal = fetchFavoriteTemplates;
    
    // Cleanup on unmount
    return () => {
      refreshFavoritesGlobal = null;
    };
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleFavoriteSection = () => {
    setIsFavoriteExpanded(!isFavoriteExpanded);
  };

  const toggleNavigationSection = () => {
    setIsNavigationExpanded(!isNavigationExpanded);
  };

  const toggleTemplatesSection = () => {
    setIsTemplatesExpanded(!isTemplatesExpanded);
  };

  // Helper function to determine the correct link for a favorite template
  const getTemplateLink = (template) => {
    if (!template) {
      console.log('No template, defaulting to CreateLetter');
      return `/dashboard/CreateLetter`;
    }
    
    // Always link to CreateLetter page with templateId parameter for favorite templates
    return `/dashboard/CreateLetter?templateId=${template.id}`;
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ zIndex: 9999 }}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">
            {collapsed ? 'W' : <Image src="/images/logo.png" alt="Worsie Logo" width={100} height={100} />}
          </h2>
          <Button
            type="text"
            icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
            onClick={toggleSidebar}
            className="toggle-button"
          />
        </div>
        
            <>
            <div className="sidebar-section">
              <ul>
                <li>
                  <Link href='/dashboard'>
                    <HomeOutlined />
                    <span className={collapsed ? 'hidden' : ''}> Home</span>
                  </Link>
                </li>
                
                <li>
                  <Link href='/dashboard/Inbox'>
                    <InboxOutlined />
                    <span className={collapsed ? 'hidden' : ''}> Inbox</span>
                  </Link>
                </li>
                <li>
                  <Link href='/dashboard/MyStaff'>
                    <TeamOutlined />
                    <span className={collapsed ? 'hidden' : ''}> My Staff</span>
                  </Link>
                </li>
                <li>
                  <Link href='/dashboard/Trash'>
                    <ImportOutlined />
                    <span className={collapsed ? 'hidden' : ''}> Trash / Deleted</span>
                  </Link>
                </li>
                <li>
                  <Link href='/dashboard/Signatures'>
                    <EditOutlined />
                    <span className={collapsed ? 'hidden' : ''}> Signatures</span>
                  </Link>
                </li>
                <li>
                  <Link href='/dashboard/Stamps'>
                    <CompassOutlined />
                    <span className={collapsed ? 'hidden' : ''}> Stamps</span>
                  </Link>
                </li>
                <li>
                  <Link href='/dashboard/UserManagement'>
                    <UserAddOutlined />
                    <span className={collapsed ? 'hidden' : ''}> User Management</span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
                  <div 
                    className={`sidebar-title ${collapsed ? 'hidden' : ''}`} 
                    onClick={toggleTemplatesSection}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <FolderOutlined style={{ marginRight: '8px' }} />
                      <span>Templates</span>
                    </div>
                    {isTemplatesExpanded ? <DownOutlined /> : <RightOutlined />}
                  </div>
                  {isTemplatesExpanded && (
                    <ul>
                      <li>
                        <Link href='/dashboard/CreateForm'>
                          <EditOutlined />
                          <span className={collapsed ? 'hidden' : ''}> New Template</span>
                        </Link>
                      </li>
                      <li>
                        <Link href='/dashboard/CreateLetter'>
                          <MailOutlined />
                          <span className={collapsed ? 'hidden' : ''}> Use Template</span>
                        </Link>
                      </li>                 
                      <li>
                        <Link href='/dashboard/Templates/Created'>
                          <FolderOpenOutlined />
                          <span className={collapsed ? 'hidden' : ''}> My Templates</span>
                        </Link>
                      </li>
                      <li>
                        <Link href='/dashboard/Templates/Shared'>
                          <ShareAltOutlined />
                          <span className={collapsed ? 'hidden' : ''}> Shared with me</span>
                        </Link>
                      </li>
                      <li>
                        <Link href='/dashboard/Templates/Shared'>
                          <ShareAltOutlined />
                          <span className={collapsed ? 'hidden' : ''}> Shared by me</span>
                        </Link>
                      </li>
                    </ul>
                  )}
                   </div>
            <div className=" sidebar-section">
              <div 
                className={`active sidebar-title ${collapsed ? 'hidden' : ''}`} 
                onClick={toggleFavoriteSection}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <StarOutlined style={{ marginRight: '8px' }} />
                  <span>Favorite Templates</span>
                </div>
                {isFavoriteExpanded ? <DownOutlined /> : <RightOutlined />}
              </div>
              {isFavoriteExpanded && (
                <ul>
                  {isLoadingFavorites ? (
                    <li className="no-favorites">
                      <span className={collapsed ? 'hidden' : ''}>Loading favorites...</span>
                    </li>
                  ) : favoriteTemplates.length > 0 ? (
                    favoriteTemplates.map((template) => (
                      <li key={template.id}>
                        <Link href={getTemplateLink(template)}>
                          <StarOutlined style={{ color: '#1890ff',marginRight: '8px' }} />
                          <span className={collapsed ? 'hidden' : ''} title={template.name || 'Untitled Template'}>
                            {collapsed ? '' : (template.name?.length > 20 ? `${template.name.substring(0, 20)}...` : template.name || 'Untitled Template')}
                          </span>
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li className="no-favorites">
                      <span className={collapsed ? 'hidden' : ''}>No favorite templates yet</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="sidebar-footer">
              <Link href='/dashboard/Report' prefetch>
                <SettingOutlined />
                <span className={collapsed ? 'hidden' : ''}> Report</span>
              </Link>
            </div>
            </>

        </div>
    </Suspense>
  );
};

export default memo(Sidebar);
