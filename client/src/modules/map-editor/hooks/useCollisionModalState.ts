import { useState, useCallback } from 'react';
import { ImpassableArea } from '../../../shared/MapDataContext';

export const useCollisionModalState = () => {
  const [showCollisionAreaModal, setShowCollisionAreaModal] = useState(false);
  const [editingCollisionArea, setEditingCollisionArea] = useState<ImpassableArea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collisionAreaToDelete, setCollisionAreaToDelete] = useState<ImpassableArea | null>(null);

  const handleCreateNewCollisionArea = useCallback(() => {
    setEditingCollisionArea(null);
    setShowCollisionAreaModal(true);
  }, []);

  const handleEditCollisionArea = useCallback((area: ImpassableArea) => {
    setEditingCollisionArea(area);
    setShowCollisionAreaModal(true);
  }, []);

  const handleDeleteCollisionArea = useCallback((area: ImpassableArea) => {
    setCollisionAreaToDelete(area);
    setShowDeleteConfirm(true);
  }, []);

  const handleCloseModals = useCallback(() => {
    setShowCollisionAreaModal(false);
    setShowDeleteConfirm(false);
    setEditingCollisionArea(null);
    setCollisionAreaToDelete(null);
  }, []);

  return {
    showCollisionAreaModal,
    setShowCollisionAreaModal,
    editingCollisionArea,
    setEditingCollisionArea,
    showDeleteConfirm,
    setShowDeleteConfirm,
    collisionAreaToDelete,
    setCollisionAreaToDelete,
    handleCreateNewCollisionArea,
    handleEditCollisionArea,
    handleDeleteCollisionArea,
    handleCloseModals
  };
};
