'use client';
import React, { useState, useEffect } from 'react';
import { List, Typography, Button, message, Spin, Alert, Tag, Row, Col, Space } from 'antd';
import { CheckOutlined, BellOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import '@/styles/NotificationsPage.css';
import { useRouter } from 'next/navigation';
import { notificationService, Notification } from '@/app/services/notificationService';

const { Title, Text } = Typography;

const NotificationsPage = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedNotifications = await notificationService.getNotifications();
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      await notificationService.markAllAsRead();
      
      // Update local state to mark all as read
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }));
      setNotifications(updatedNotifications);
      
      message.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      message.error('Failed to mark all notifications as read');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  // Helper function to fetch letter details with all fields (same as NavigationBar)
  const fetchLetterDetails = async (letterId: string) => {
    const headers = { 'Content-Type': 'application/json' };
    const config = { method: 'GET', headers, credentials: 'include' as RequestCredentials };
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://papercut-backend-container.ambitiousmoss-ff53d51e.centralus.azurecontainerapps.io/api/v1'}/letters/${letterId}`, config);
    
    if (!response.ok) {
      let errorData = { message: `HTTP error! Status: ${response.status}` };
      try { 
        errorData = await response.json(); 
      } catch (e) { }
      throw new Error(errorData?.message || `HTTP error! Status: ${response.status}`);
    }
    
    if (response.status === 204) return undefined;
    try { 
      return await response.json(); 
    } catch (e) { 
      return undefined; 
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read if not already read
      if (!notification.read) {
        await notificationService.markAsRead(notification.id);
        
        // Update local state
        const updatedNotifications = notifications.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        );
        setNotifications(updatedNotifications);
      }

      // Handle different notification types
      if (notification.entityType === 'letter' && notification.entityId) {
        try {
          // Fetch letter details to determine routing (same logic as NavigationBar)
          const letterData = await fetchLetterDetails(notification.entityId);
          
          // Determine letter type based on originalPdfFileId
          const isTemplateBasedLetter = letterData.originalPdfFileId === null;
          
          if (isTemplateBasedLetter) {
            router.push(`/dashboard/Inbox/LetterReview/${notification.entityId}`);
          } else {
            router.push(`/dashboard/Inbox/LetterPdfReview/${notification.entityId}`);
          }
        } catch (fetchError) {
          console.error('Error fetching letter details:', fetchError);
          // Fallback to template-based letter
          router.push(`/dashboard/Inbox/LetterReview/${notification.entityId}`);
        }
      } else if (notification.entityType === 'space' && notification.entityId) {
        router.push(`/dashboard/spaces/${notification.entityId}`);
      } else if (notification.entityType === 'cabinet' && notification.entityId) {
        router.push(`/dashboard/cabinets/${notification.entityId}`);
      } else if (notification.entityType === 'record' && notification.entityId) {
        router.push(`/dashboard/records/${notification.entityId}`);
      } else {
        // Handle legacy notifications or other types
        console.log('Unknown notification type or missing entityId:', notification);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      message.error('Failed to navigate to notification');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString.toString();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'letter_review_request':
      case 'letter_review_approved':
      case 'letter_final_approved':
        return 'blue';
      case 'letter_review_rejected':
      case 'letter_final_rejected':
        return 'red';
      case 'space_creation':
      case 'space_approval':
        return 'green';
      case 'space_rejection':
        return 'orange';
      default:
        return 'default';
    }
  };

  const formatNotificationType = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (error) {
    return (
      <div className="notifications-page">
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              Back
            </Button>
          </Col>
        </Row>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={fetchNotifications} type="primary" size="small">
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            Back
          </Button>
        </Col>
        <Col>
          <Space>
            <Title level={2} style={{ margin: 0 }}>
              <BellOutlined style={{ marginRight: 8 }} />
              Notifications {unreadCount > 0 && <Tag color="red">{unreadCount} unread</Tag>}
            </Title>
          </Space>
        </Col>
        <Col>
          {unreadCount > 0 && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleMarkAllAsRead}
              loading={markingAllAsRead}
            >
              Mark All as Read
            </Button>
          )}
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading notifications...</div>
        </div>
      ) : (
        <List
          dataSource={notifications}
          renderItem={(notification) => (
            <List.Item
              onClick={() => handleNotificationClick(notification)}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              style={{
                cursor: 'pointer',
                backgroundColor: !notification.read ? '#e6f7ff' : 'transparent',
                borderLeft: !notification.read ? '4px solid #1890ff' : '4px solid transparent',
                padding: '16px 20px',
                transition: 'all 0.3s ease'
              }}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong style={{ fontSize: '16px' }}>
                      {notification.title}
                    </Text>
                    <Tag color={getNotificationTypeColor(notification.type)}>
                      {formatNotificationType(notification.type)}
                    </Tag>
                    {!notification.read && <Tag color="red">New</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <div style={{ marginBottom: 8, fontSize: '14px' }}>
                      {notification.message}
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatDate(notification.createdAt)}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <BellOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
                <div>No notifications yet</div>
              </div>
            )
          }}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
