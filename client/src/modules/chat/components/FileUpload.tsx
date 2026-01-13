import React, { useState, useRef } from 'react';
import { Upload, Button, message, Progress, Space, Typography, List, Tag } from 'antd';
import { UploadOutlined, FileOutlined, FileImageOutlined, FilePdfOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { Attachment } from '../../../redux/types/chat';
import { useAppDispatch } from '../../../redux/hooks';
import { chatThunks } from '../../../redux/slices/chatSlice';

const { Text } = Typography;

interface FileUploadProps {
  roomId: string;
  onFileUploaded?: (attachment: Attachment) => void;
  maxFileSize?: number; // in bytes, default 10MB
  allowedFileTypes?: string[];
  maxFiles?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  roomId,
  onFileUploaded,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx'],
  maxFiles = 5
}) => {
  const dispatch = useAppDispatch();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImageOutlined />;
    if (fileType === 'application/pdf') return <FilePdfOutlined />;
    if (fileType.startsWith('text/')) return <FileTextOutlined />;
    return <FileOutlined />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const beforeUpload = (file: File) => {
    // Check file size
    if (file.size > maxFileSize) {
      message.error(`File size must be less than ${formatFileSize(maxFileSize)}`);
      return false;
    }

    // Check file type
    const isAllowed = allowedFileTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type);
      }
      return file.type.match(type);
    });

    if (!isAllowed) {
      message.error('File type not allowed');
      return false;
    }

    // Check max files
    if (fileList.length >= maxFiles) {
      message.error(`Maximum ${maxFiles} files allowed`);
      return false;
    }

    return true;
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fileId = file.name + Date.now();
    
    try {
      // Simulate upload progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        if (progress >= 90) clearInterval(progressInterval);
      }, 100);

      const attachment = await dispatch(chatThunks.uploadFile({ file, roomId })).unwrap();
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      message.success(`${file.name} uploaded successfully`);
      
      if (onFileUploaded) {
        onFileUploaded(attachment);
      }

      // Remove from file list after successful upload
      // Use file name + size as unique identifier since native File doesn't have uid
      setFileList(prev => prev.filter(f => !(f.name === file.name && f.size === file.size)));
    } catch (error) {
      message.error(`Failed to upload ${file.name}`);
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 1000);
    }
  };

  const handleRemove = (file: UploadFile) => {
    setFileList(prev => prev.filter(f => f.uid !== file.uid));
  };

  const uploadProps: UploadProps = {
    beforeUpload,
    onRemove: handleRemove,
    fileList,
    multiple: true,
    showUploadList: false,
    customRequest: ({ file }) => {
      const uploadFile = file as File;
      handleUpload(uploadFile);
    },
  };

  return (
    <div className="file-upload">
      <Upload {...uploadProps}>
        <Button 
          icon={<UploadOutlined />} 
          disabled={uploading || fileList.length >= maxFiles}
          loading={uploading}
        >
          {uploading ? 'Uploading...' : `Upload File (${fileList.length}/${maxFiles})`}
        </Button>
      </Upload>

      {fileList.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Files to upload:</Text>
          <List
            size="small"
            dataSource={fileList}
            renderItem={(file) => {
              const fileId = file.name + file.uid;
              const progress = uploadProgress[fileId] || 0;
              
              return (
                <List.Item
                  actions={[
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => handleRemove(file)}
                      disabled={uploading}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={getFileIcon(file.type || '')}
                    title={
                      <Space>
                        <Text ellipsis style={{ maxWidth: 200 }}>{file.name}</Text>
                        <Tag color="blue">{formatFileSize(file.size || 0)}</Tag>
                      </Space>
                    }
                  />
                  {progress > 0 && progress < 100 && (
                    <Progress 
                      percent={progress} 
                      size="small" 
                      style={{ width: 100 }}
                    />
                  )}
                  {progress === 100 && (
                    <Text type="success">✓</Text>
                  )}
                </List.Item>
              );
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Max file size: {formatFileSize(maxFileSize)} • Allowed: {allowedFileTypes.join(', ')}
        </Text>
      </div>
    </div>
  );
};

export default FileUpload;
