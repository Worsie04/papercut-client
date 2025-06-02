'use client';
import React, { useState, useEffect } from 'react';
import { Table, Button, Avatar, message, Modal, Select, Form, Input, Tag, Space, Tooltip } from 'antd';
import { 
  CheckOutlined,
  CloseOutlined,
  SendOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { getLettersPendingMyAction } from '@/utils/api';
import { useRouter } from 'next/navigation';

const { TextArea } = Input;

const Approvals = ({ className }) => {
  const router = useRouter();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const letters = await getLettersPendingMyAction();
      
      const formattedApprovals = letters.map(letter => {
        const submitter = letter.user;
        const submitterName = submitter ? `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim() || submitter.email : 'Unknown User';
        const submitterAvatar = submitter && submitter.avatar ? submitter.avatar : '/images/avatar.png';

        return {
          key: letter.id,
          id: letter.id,
          description: letter.name || `Letter ${letter.id.substring(0, 6)}...`,
          type: letter.originalPdfFileId === null ? 'Letter' : 'Letter (PDF)',
          sentBy: {
            name: submitterName,
            avatar: submitterAvatar
          },
          sentOn: new Date(letter.createdAt).toLocaleDateString('az-AZ'),
          priority: 'Normal',
          deadlines: 'N/A',
          workflowStatus: letter.workflowStatus
        };
      });
      
      setApprovals(formattedApprovals);
    } catch (error) {
      console.error('Error fetching letters for my action:', error);
      message.error('Failed to load letters needing your action');
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (record, action) => {
    const reviewPagePath = record.type === 'Letter'
        ? `/dashboard/Inbox/LetterReview/${record.id}`
        : `/dashboard/Inbox/LetterPdfReview/${record.id}`;

    router.push(`${reviewPagePath}?action=${action}`);
  };

  const onLetterActionClick = (record) => {
    const reviewPagePath = record.type === 'Letter'
        ? `/dashboard/Inbox/LetterReview/${record.id}`
        : `/dashboard/Inbox/LetterPdfReview/${record.id}`;

    router.push(reviewPagePath);
  };

  const columns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { 
      title: 'Sent by', 
      dataIndex: 'sentBy', 
      key: 'sentBy', 
      render: (sentBy) => (
        <>
          <Avatar src={sentBy?.avatar || '/images/avatar.png'} />
          {' '}
          {sentBy?.name || 'Unknown User'}
        </>
      )
    },
    { title: 'Sent on', dataIndex: 'sentOn', key: 'sentOn' },
    { 
      title: 'Priority', 
      dataIndex: 'priority', 
      key: 'priority', 
      render: (priority) => (
        <Tag color={priority === 'High' ? 'red' : priority === 'Med' ? 'orange' : 'green'}>
          {priority}
        </Tag>
      )
    },
    { title: 'Deadlines', dataIndex: 'deadlines', key: 'deadlines' },
    // {
    //   title: 'Actions Required',
    //   key: 'actions',
    //   render: (_, record) => {
    //     if (record.workflowStatus === 'PENDING_REVIEW') {
    //       return (
    //         <Space className="action-buttons">
    //           <Tooltip title="Approve Step">
    //             <Button 
    //               icon={<CheckOutlined />} 
    //               type="text" 
    //               className="action-btn checkok" 
    //               onClick={(e) => { 
    //                 e.stopPropagation(); 
    //                 handleActionClick(record, 'approve'); 
    //               }} 
    //             />
    //           </Tooltip>
    //           <Tooltip title="Reject Step">
    //             <Button 
    //               icon={<CloseOutlined />} 
    //               type="text" 
    //               className="action-btn closedel" 
    //               onClick={(e) => { 
    //                 e.stopPropagation(); 
    //                 handleActionClick(record, 'reject'); 
    //               }} 
    //             />
    //           </Tooltip>
    //           <Tooltip title="Reassign Step">
    //             <Button 
    //               icon={<SendOutlined />} 
    //               type="text" 
    //               className="action-btn assignok" 
    //               onClick={(e) => { 
    //                 e.stopPropagation(); 
    //                 handleActionClick(record, 'reassign'); 
    //               }} 
    //             />
    //           </Tooltip>
    //         </Space>
    //       );
    //     } else if (record.workflowStatus === 'PENDING_APPROVAL') {
    //       return (
    //         <Space className="action-buttons">
    //           <Tooltip title="Final Approve">
    //             <Button 
    //               icon={<CheckCircleOutlined />} 
    //               type="text" 
    //               className="action-btn checkok" 
    //               onClick={(e) => { 
    //                 e.stopPropagation(); 
    //                 handleActionClick(record, 'final_approve'); 
    //               }} 
    //             />
    //           </Tooltip>
    //           <Tooltip title="Final Reject">
    //             <Button 
    //               icon={<CloseOutlined />} 
    //               type="text" 
    //               className="action-btn closedel" 
    //               onClick={(e) => { 
    //                 e.stopPropagation(); 
    //                 handleActionClick(record, 'final_reject'); 
    //               }} 
    //             />
    //           </Tooltip>
    //         </Space>
    //       );
    //     }
    //     return null;
    //   },
    // },
  ];

  return (
    <div className={`bg-white p-4 rounded shadow-md ${className || ''}`}>
      <h4 className="text-gray-700 font-semibold mb-4">Pending Approvals</h4>
      <Table 
        columns={columns} 
        dataSource={approvals} 
        rowKey="key"
        pagination={false} 
        loading={loading}
        rowSelection={{ type: 'checkbox' }}
        onRow={(record) => ({
          onClick: () => onLetterActionClick(record),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
};

export default Approvals;
