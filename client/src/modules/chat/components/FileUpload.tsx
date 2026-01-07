import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Button, 
  Progress, 
  Space, 
  Typography, 
  Card,
  Tooltip,
  message,
  Modal
} from 'antd';
import {
  UploadOutlined,
  FileOutlined,
  DeleteOutlined,
  InboxOutlined,
  PaperClipOutlined,
  FileImageOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  AudioOutlined,
  PictureOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onFileUpload?: (file: File, progress: number) => void;
  onFileComplete?: (file: File, url: string) => void;
  onFileError?: (file: File, error: string) => void;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileUpload,
  onFileComplete,
  onFileError,
  maxFileSize = 10, // 10MB default
  maxFiles = 5,
  acceptedTypes = [
    'image/*',
    'application/pdf',
    'text/*',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/*',
    'audio/*'
  ],
  className = '',
  disabled = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file type
  const isValidFileType = (file: File): boolean => {
    if (acceptedTypes.includes('*/*')) return true;
    return acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/*')[0];
        return file.type.startsWith(category);
      }
      return file.type === type;
    });
  };

  // Validate file size
  const isValidFileSize = (file: File): boolean => {
    return file.size <= maxFileSize * 1024 * 1024;
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PictureOutlined style={{ fontSize: '16px', color: '#1890ff' }} />;
    }
    if (file.type.startsWith('video/')) {
      return <PlayCircleOutlined style={{ fontSize: '16px', color: '#722ed1' }} />;
    }
    if (file.type.startsWith('audio/')) {
      return <AudioOutlined style={{ fontSize: '16px', color: '#52c41a' }} />;
    }
    if (file.type.includes('pdf')) {
      return <FileTextOutlined style={{ fontSize: '16px', color: '#fa8c16' }} />;
    }
    return <FileOutlined style={{ fontSize: '16px', color: '#8c8c8c' }} />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }
      if (!isValidFileSize(file)) {
        errors.push(`${file.name}: File size exceeds ${maxFileSize}MB limit`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      message.error(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      const newUploadedFiles = validFiles.map(file => ({
        file,
        progress: 0,
        status: 'uploading' as const
      }));

      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      onFileSelect(validFiles);

      // Simulate upload progress
      newUploadedFiles.forEach(uploadedFile => {
        simulateFileUpload(uploadedFile);
      });
    }
  }, [maxFileSize, acceptedTypes, onFileSelect]);

  // Simulate file upload (in real app, this would be actual API call)
  const simulateFileUpload = useCallback((uploadedFile: UploadedFile) => {
    const interval = setInterval(() => {
      setUploadedFiles(prev => prev.map(f => {
        if (f.file === uploadedFile.file) {
          const newProgress = Math.min(f.progress + Math.random() * 20, 100);
          
          if (newProgress < 100) {
            onFileUpload?.(f.file, newProgress);
            return { ...f, progress: newProgress };
          } else {
            clearInterval(interval);
            const url = URL.createObjectURL(f.file); // In real app, this would be server URL
            onFileComplete?.(f.file, url);
            return { ...f, progress: 100, status: 'completed', url };
          }
        }
        return f;
      }));
    }, 500);
  }, [onFileUpload, onFileComplete]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  }, [handleFileSelect]);

  // Remove file
  const handleRemoveFile = useCallback((file: File) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== file));
    onFileSelect([]); // Notify parent that selection changed
  }, [onFileSelect]);

  // Upload props for Ant Design Upload component
  const uploadProps: UploadProps = {
    multiple: true,
    accept: acceptedTypes.join(','),
    beforeUpload: () => false, // Prevent automatic upload
    onChange: (info) => {
      if (info.fileList.length > 0) {
        handleFileSelect(info.fileList.map(item => item.originFileObj as File));
      }
    }
  };

  return (
    <div className={`file-upload ${className}`} style={{ width: '100%' }}>
      {/* Drag and Drop Area */}
      <Card
        size="small"
        style={{
          border: isDragging ? '2px dashed #1890ff' : '2px dashed var(--color-border)',
          backgroundColor: isDragging ? 'rgba(24, 144, 255, 0.05)' : 'var(--color-bg-secondary)',
          transition: 'all 0.3s ease',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        onMouseEnter={handleDragEnter}
        onMouseLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div style={{ 
          padding: '24px', 
          textAlign: 'center',
          pointerEvents: disabled ? 'none' : 'auto'
        }}>
          <InboxOutlined 
            style={{ 
              fontSize: '48px', 
              color: isDragging ? '#1890ff' : 'var(--color-text-secondary)',
              marginBottom: '12px'
            }} 
          />
          <Text style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
            Drag & drop files here or click to browse
          </Text>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
            Supported formats: {acceptedTypes.join(', ')} • Max size: {maxFileSize}MB • Max files: {maxFiles}
          </Text>
        </div>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <Text strong style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
            Selected Files ({uploadedFiles.length}/{maxFiles})
          </Text>
          
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {uploadedFiles.map((uploadedFile, index) => (
              <Card
                key={index}
                size="small"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* File Icon */}
                  {getFileIcon(uploadedFile.file)}
                  
                  {/* File Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text 
                      ellipsis 
                      style={{ fontSize: '12px', display: 'block' }}
                      title={uploadedFile.file.name}
                    >
                      {uploadedFile.file.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {formatFileSize(uploadedFile.file.size)}
                    </Text>
                  </div>

                  {/* Progress */}
                  {uploadedFile.status === 'uploading' && (
                    <Progress
                      percent={uploadedFile.progress}
                      size="small"
                      style={{ width: '60px' }}
                    />
                  )}

                  {/* Status */}
                  {uploadedFile.status === 'completed' && (
                    <Text type="success" style={{ fontSize: '11px' }}>
                      ✓ Uploaded
                    </Text>
                  )}

                  {uploadedFile.status === 'error' && (
                    <Text type="danger" style={{ fontSize: '11px' }}>
                      ✗ Error
                    </Text>
                  )}

                  {/* Remove Button */}
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(uploadedFile.file);
                    }}
                    style={{ 
                      fontSize: '10px',
                      color: 'var(--color-text-secondary)'
                    }}
                  />
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* Upload Button Alternative */}
      {!disabled && (
        <div style={{ marginTop: '8px', textAlign: 'center' }}>
          <Button
            type="text"
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            size="small"
            style={{ fontSize: '12px' }}
          >
            Browse Files
          </Button>
        </div>
      )}
    </div>
  );
};