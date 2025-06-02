'use client';
import React, { useState, useEffect } from 'react';
import { Button, Table, Typography, Spin, message, Tag, Tooltip, Popconfirm } from 'antd';
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  RestOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import '@/styles/MyStaff.css';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/app/config';
import Dashboard from '@/components/DashboardPaperCut';

const AntTable = Table;
const { Title } = Typography;

interface DeletedLetter {
  key: string;
  id: string;
  name?: string | null;
  templateId?: string | null;
  signedPdfUrl?: string | null;
  createdAt: string;
  deletedAt: string;
  template?: {
      id: string;
      name: string;
  } | null;
  workflowStatus?: string;
}

const TrashPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletedLetters, setDeletedLetters] = useState<DeletedLetter[]>([]);

  useEffect(() => {
    fetchDeletedLetters();
  }, []);

  const fetchDeletedLetters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/letters/deleted`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch deleted letters' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const formattedLetters = data.map((letter: any): DeletedLetter => ({
        key: letter.id,
        id: letter.id,
        name: letter.name ?? (letter.template ? `From: ${letter.template.name}` : 'Signed PDF Document'),
        templateId: letter.templateId,
        signedPdfUrl: letter.signedPdfUrl,
        createdAt: new Date(letter.createdAt).toLocaleDateString('en-GB', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        deletedAt: new Date(letter.deletedAt).toLocaleDateString('en-GB', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        template: letter.template ? { id: letter.template.id, name: letter.template.name } : null,
        workflowStatus: letter.workflowStatus
      }));
      
      setDeletedLetters(formattedLetters);
    } catch (error: any) {
      console.error('Error fetching deleted letters:', error);
      message.error(`Failed to load deleted letters: ${error.message}`);
      setDeletedLetters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreLetter = async (letterId: string) => {
    try {
      const response = await fetch(`${API_URL}/letters/${letterId}/restore`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore letter');
      }
      
      message.success('Letter restored successfully');
      fetchDeletedLetters(); // Refresh the list
    } catch (error: any) {
      console.error('Error restoring letter:', error);
      message.error('Failed to restore letter');
    }
  };

  const handlePermanentDelete = async (letterId: string) => {
    try {
      const response = await fetch(`${API_URL}/letters/${letterId}/permanent`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to permanently delete letter');
      }
      
      message.success('Letter permanently deleted');
      fetchDeletedLetters(); // Refresh the list
    } catch (error: any) {
      console.error('Error permanently deleting letter:', error);
      message.error('Failed to permanently delete letter');
    }
  };

  const trashColumns: ColumnsType<DeletedLetter> = [
    {
      title: 'Type',
      key: 'type',
      width: 50,
      render: (_, record) => (
        <Tooltip title={record.signedPdfUrl ? 'Signed PDF Document' : 'Template Based Letter'}>
          {record.signedPdfUrl ? 
            <FilePdfOutlined style={{fontSize: '18px', color: '#FF5733'}} /> : 
            <FileTextOutlined style={{fontSize: '18px', color: '#337BFF'}} />
          }
        </Tooltip>
      )
    },
    {
      title: 'Letter Name / Source',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => name || 'Untitled Letter'
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        let color = 'default';
        let text = record.workflowStatus || 'Unknown';
        
        switch(record.workflowStatus) {
          case 'approved':
            color = 'green';
            text = 'Approved';
            break;
          case 'pending_review':
            color = 'blue';
            text = 'Pending Review';
            break;
          case 'pending_approval':
            color = 'orange';
            text = 'Pending Approval';
            break;
          case 'rejected':
            color = 'red';
            text = 'Rejected';
            break;
          case 'draft':
            color = 'default';
            text = 'Draft';
            break;
        }
        
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
    },
    {
      title: 'Deleted At',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Tooltip title="Restore Letter">
            <Button 
              type="text" 
              icon={<RestOutlined />}
              onClick={(e) => { 
                e.stopPropagation(); 
                handleRestoreLetter(record.id); 
              }}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Delete Permanently">
            <Popconfirm
              title="Delete permanently"
              description="Are you sure you want to permanently delete this letter? This action cannot be undone."
              onConfirm={(e) => {
                e?.stopPropagation();
                handlePermanentDelete(record.id);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                type="text" 
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
                danger
              />
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="my-staff-page">
      <div className="header-section">
        <Button
          className="back-button"
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => router.back()}
        />
        <Title level={2} className="page-title">Trash</Title>
      </div>

   

      <div style={{ marginTop: '20px' }}>
        <Spin spinning={loading}>
          <AntTable<DeletedLetter>
            columns={trashColumns}
            dataSource={deletedLetters}
            rowKey="id"
            pagination={{ pageSize: 10, size: 'small' }}
            size="small"
            locale={{
              emptyText: 'No deleted letters found'
            }}
          />
        </Spin>
      </div>
    </div>
  );
};

export default TrashPage;