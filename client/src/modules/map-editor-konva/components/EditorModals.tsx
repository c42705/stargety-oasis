/**
 * EditorModals Component
 *
 * Renders all modal dialogs for the map editor including:
 * - Area form modal (create/edit interactive areas, including impassable/collision areas)
 * - Delete confirmation dialogs (areas, keyboard delete)
 */

import React from 'react';
import type { InteractiveArea } from '../types';
import { AreaFormModal } from '../../../components/AreaFormModal';
import { ConfirmationDialog } from '../../../components/ConfirmationDialog';

interface EditorModalsProps {
  // Area modal (unified for all area types including collision/impassable)
  showAreaModal: boolean;
  editingArea: InteractiveArea | null;
  onAreaFormSubmit: (data: Partial<InteractiveArea>) => void;
  onAreaFormCancel: () => void;

  // Collision area modal (deprecated - uses AreaFormModal with impassable action type)
  showCollisionAreaModal: boolean;
  editingCollisionArea: any | null;
  onCollisionAreaFormSubmit: (data: any) => void;
  onCollisionAreaFormCancel: () => void;

  // Delete confirmations
  showDeleteConfirm: boolean;
  areaToDelete: InteractiveArea | null;
  onConfirmDeleteArea: () => void;
  onCancelDeleteArea: () => void;

  showCollisionDeleteConfirm: boolean;
  collisionAreaToDelete: any | null;
  onConfirmDeleteCollisionArea: () => void;
  onCancelDeleteCollisionArea: () => void;

  showKeyboardDeleteConfirm: boolean;
  shapesToDelete: string[];
  onConfirmKeyboardDelete: () => void;
  onCancelKeyboardDelete: () => void;
}

export const EditorModals: React.FC<EditorModalsProps> = ({
  showAreaModal,
  editingArea,
  onAreaFormSubmit,
  onAreaFormCancel,
  showCollisionAreaModal,
  editingCollisionArea,
  onCollisionAreaFormSubmit,
  onCollisionAreaFormCancel,
  showDeleteConfirm,
  areaToDelete,
  onConfirmDeleteArea,
  onCancelDeleteArea,
  showCollisionDeleteConfirm,
  collisionAreaToDelete,
  onConfirmDeleteCollisionArea,
  onCancelDeleteCollisionArea,
  showKeyboardDeleteConfirm,
  shapesToDelete,
  onConfirmKeyboardDelete,
  onCancelKeyboardDelete,
}) => {
  return (
    <>
      {/* Area Form Modal */}
      <AreaFormModal
        isOpen={showAreaModal}
        editingArea={editingArea}
        onSave={onAreaFormSubmit}
        onClose={onAreaFormCancel}
      />

      {/* Collision Area Form Modal (uses unified AreaFormModal with impassable action type) */}
      <AreaFormModal
        isOpen={showCollisionAreaModal}
        editingArea={editingCollisionArea ? {
          ...editingCollisionArea,
          actionType: 'impassable',
          actionConfig: null,
        } : null}
        onSave={(data) => {
          // Convert back to collision area format for backward compatibility
          onCollisionAreaFormSubmit({
            ...data,
            type: 'impassable',
          });
        }}
        onClose={onCollisionAreaFormCancel}
        title={editingCollisionArea ? 'Edit Collision Area' : 'Create Collision Area'}
      />

      {/* Interactive Area Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Interactive Area"
        message={`Are you sure you want to delete "${areaToDelete?.name}"?`}
        onConfirm={onConfirmDeleteArea}
        onClose={onCancelDeleteArea}
      />

      {/* Collision Area Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showCollisionDeleteConfirm}
        title="Delete Collision Area"
        message={`Are you sure you want to delete this collision area?`}
        onConfirm={onConfirmDeleteCollisionArea}
        onClose={onCancelDeleteCollisionArea}
      />

      {/* Keyboard Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showKeyboardDeleteConfirm}
        title="Delete Selected Shapes"
        message={`Are you sure you want to delete ${shapesToDelete.length} selected shape${shapesToDelete.length > 1 ? 's' : ''}?`}
        confirmText="Delete"
        type="danger"
        onConfirm={onConfirmKeyboardDelete}
        onClose={onCancelKeyboardDelete}
      />
    </>
  );
};

