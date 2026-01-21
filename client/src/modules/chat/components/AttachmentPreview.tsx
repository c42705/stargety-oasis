import React from 'react';
import { Image, Button, Space, Typography, Tag, Card } from 'antd';
import { FileOutlined, FileImageOutlined, FilePdfOutlined, FileTextOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { Attachment } from '../../../redux/types/chat';
import type { ImageProps } from 'antd';

const { Text } = Typography;

interface AttachmentPreviewProps {
  attachment: Attachment;
  onDownload?: (attachment: Attachment) => void;
  onPreview?: (attachment: Attachment) => void;
  showActions?: boolean;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  onDownload,
  onPreview,
  showActions = true
}) => {
  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <FileImageOutlined style={{ fontSize: 24 }} />;
    if (mimetype === 'application/pdf') return <FilePdfOutlined style={{ fontSize: 24 }} />;
    if (mimetype.startsWith('text/')) return <FileTextOutlined style={{ fontSize: 24 }} />;
    return <FileOutlined style={{ fontSize: 24 }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isImage = attachment.mimetype.startsWith('image/');

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.filename;
      link.click();
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(attachment);
    } else if (isImage) {
      // Default image preview - open in new tab
      window.open(attachment.url, '_blank');
    }
  };

  if (isImage) {
    return (
      <Card
        size="small"
        style={{ maxWidth: 300, marginTop: 8 }}
        bodyStyle={{ padding: 8 }}
      >
        <div style={{ position: 'relative' }}>
          <Image
            src={attachment.url}
            alt={attachment.filename}
            style={{ 
              maxWidth: '100%', 
              maxHeight: 200,
              borderRadius: 4,
              cursor: 'pointer'
            }}
            preview={{
              src: attachment.url,
              title: attachment.filename,
            }}
          />
          {showActions && (
            <div style={{ marginTop: 8 }}>
              <Space size={4}>
                <Text ellipsis style={{ fontSize: 12, maxWidth: 150 }}>
                  {attachment.filename}
                </Text>
                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                  {formatFileSize(attachment.size)}
                </Tag>
              </Space>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Non-image attachment
  return (
    <Card
      size="small"
      style={{ maxWidth: 300, marginTop: 8 }}
      bodyStyle={{ padding: 12 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Space>
          {getFileIcon(attachment.mimetype)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text ellipsis style={{ display: 'block', fontSize: 13 }}>
              {attachment.filename}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatFileSize(attachment.size)}
            </Text>
          </div>
        </Space>
        
        {showActions && (
          <Space size={4}>
            {onPreview && (
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={handlePreview}
              >
                Preview
              </Button>
            )}
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
            >
              Download
            </Button>
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default AttachmentPreview;
