import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://papercut-backend-container.ambitiousmoss-ff53d51e.centralus.azurecontainerapps.io/api/v1';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'space_approval' | 'space_rejection' | 'space_reassignment' | 'space_creation' | 'space_deletion' |
        'cabinet_approval' | 'cabinet_rejection' | 'cabinet_reassignment' | 'cabinet_creation' | 'cabinet_deletion' | 'cabinet_update' | 'cabinet_resubmitted' |
        'record_approval' | 'record_rejection' | 'record_reassignment' | 'record_creation' | 'record_deletion' | 'record_update' | 'record_modification' |
        'template_share' | 'template_update' | 'template_delete' |
        'letter_review_request' | 'letter_review_approved' | 'letter_review_rejected' | 'letter_final_approved' | 'letter_final_rejected';
  read: boolean;
  entityId?: string;
  entityType?: 'space' | 'record' | 'cabinet' | 'template' | 'letter';
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  private getAuthHeaders() {
    return {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    };
  }

  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await axios.get(`${API_URL}/notifications`, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, this.getAuthHeaders());
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await axios.put(`${API_URL}/notifications/read/all`, {}, this.getAuthHeaders());
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSpaceApprovalNotification(userId: string, spaceId: string, spaceName: string): Promise<void> {
    try {
      await axios.post(`${API_URL}/notifications`, {
        userId,
        title: 'Space Approved',
        message: `Your space "${spaceName}" has been approved.`,
        type: 'space_approval',
        entityId: spaceId,
        entityType: 'space'
      }, this.getAuthHeaders());
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSpaceRejectionNotification(userId: string, spaceId: string, spaceName: string, reason: string): Promise<void> {
    try {
      await axios.post(`${API_URL}/notifications`, {
        userId,
        title: 'Space Rejected',
        message: `Your space "${spaceName}" has been rejected. Reason: ${reason}`,
        type: 'space_rejection',
        entityId: spaceId,
        entityType: 'space'
      }, this.getAuthHeaders());
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSpaceReassignmentNotification(userId: string, spaceId: string, spaceName: string): Promise<void> {
    try {
      await axios.post(`${API_URL}/notifications`, {
        userId,
        title: 'Space Approval Reassigned',
        message: `A space approval request "${spaceName}" has been assigned to you.`,
        type: 'space_reassignment',
        entityId: spaceId,
        entityType: 'space'
      }, this.getAuthHeaders());
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSpaceCreationNotification(userId: string, spaceId: string, spaceName: string): Promise<void> {
    try {
      await axios.post(`${API_URL}/notifications`, {
        userId,
        title: 'New Space Approval Request',
        message: `A new space "${spaceName}" requires your approval.`,
        type: 'space_creation',
        entityId: spaceId,
        entityType: 'space'
      }, this.getAuthHeaders());
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      const message = error.response.data.message || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      return new Error('No response received from server');
    } else {
      return new Error('Error setting up the request');
    }
  }
}

export const notificationService = new NotificationService();