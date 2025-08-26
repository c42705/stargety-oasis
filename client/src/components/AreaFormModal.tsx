import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { InteractiveArea } from '../shared/MapDataContext';
import './AreaFormModal.css';

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (areaData: Partial<InteractiveArea>) => void;
  editingArea?: InteractiveArea | null;
  title?: string;
}

interface FormData {
  name: string;
  maxParticipants: number;
  description: string;
  type: InteractiveArea['type'];
  color: string;
}

interface FormErrors {
  name?: string;
  maxParticipants?: string;
  description?: string;
  type?: string;
  color?: string;
}

const AREA_TYPES: { value: InteractiveArea['type']; label: string }[] = [
  { value: 'meeting-room', label: 'Meeting Room' },
  { value: 'presentation-hall', label: 'Presentation Hall' },
  { value: 'coffee-corner', label: 'Coffee Corner' },
  { value: 'game-zone', label: 'Game Zone' },
  { value: 'custom', label: 'Custom Area' }
];

const DEFAULT_COLORS = [
  '#4A90E2', // Blue
  '#9B59B6', // Purple
  '#D2691E', // Orange
  '#E74C3C', // Red
  '#27AE60', // Green
  '#F39C12', // Yellow
  '#34495E', // Dark Blue
  '#E67E22'  // Dark Orange
];

export const AreaFormModal: React.FC<AreaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingArea,
  title
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    maxParticipants: 10,
    description: '',
    type: 'custom',
    color: '#4A90E2'
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (isOpen) {
      if (editingArea) {
        setFormData({
          name: editingArea.name,
          maxParticipants: editingArea.maxParticipants || 10,
          description: editingArea.description,
          type: editingArea.type,
          color: editingArea.color
        });
      } else {
        setFormData({
          name: '',
          maxParticipants: 10,
          description: '',
          type: 'custom',
          color: '#4A90E2'
        });
      }
      setErrors({});
    }
  }, [isOpen, editingArea]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    }

    if (formData.maxParticipants < 1) {
      newErrors.maxParticipants = 'Must be at least 1 participant';
    } else if (formData.maxParticipants > 100) {
      newErrors.maxParticipants = 'Cannot exceed 100 participants';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const areaData: Partial<InteractiveArea> = {
      name: formData.name.trim(),
      maxParticipants: formData.maxParticipants,
      description: formData.description.trim(),
      type: formData.type,
      color: formData.color
    };

    // If editing, include the ID
    if (editingArea) {
      areaData.id = editingArea.id;
    }

    onSave(areaData);
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content area-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title || (editingArea ? 'Edit Area' : 'Create New Area')}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="area-form">
          <div className="form-group">
            <label htmlFor="area-name">Room Name *</label>
            <input
              id="area-name"
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="Enter room name"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && (
              <span className="error-message">
                <AlertCircle size={14} />
                {errors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="max-participants">Maximum Participants *</label>
            <input
              id="max-participants"
              type="number"
              min="1"
              max="100"
              value={formData.maxParticipants}
              onChange={e => handleInputChange('maxParticipants', parseInt(e.target.value) || 1)}
              className={errors.maxParticipants ? 'error' : ''}
            />
            {errors.maxParticipants && (
              <span className="error-message">
                <AlertCircle size={14} />
                {errors.maxParticipants}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="area-description">Description *</label>
            <textarea
              id="area-description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Enter area description"
              rows={3}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && (
              <span className="error-message">
                <AlertCircle size={14} />
                {errors.description}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="area-type">Area Type</label>
            <select
              id="area-type"
              value={formData.type}
              onChange={e => handleInputChange('type', e.target.value as InteractiveArea['type'])}
            >
              {AREA_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Area Color</label>
            <div className="color-picker">
              {DEFAULT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                  title={color}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.color}
              onChange={e => handleInputChange('color', e.target.value)}
              className="color-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              {editingArea ? 'Update Area' : 'Create Area'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
