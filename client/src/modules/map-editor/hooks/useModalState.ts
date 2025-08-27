import { useState, useCallback } from 'react';
import { InteractiveArea } from '../../../shared/MapDataContext';

export const useModalState = () => {
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<InteractiveArea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<InteractiveArea | null>(null);

  const handleCreateNewArea = useCallback(() => {
    setEditingArea(null);
    setShowAreaModal(true);
  }, []);

  const handleEditArea = useCallback((area: InteractiveArea) => {
    setEditingArea(area);
    setShowAreaModal(true);
  }, []);

  const handleDeleteArea = useCallback((area: InteractiveArea) => {
    setAreaToDelete(area);
    setShowDeleteConfirm(true);
  }, []);

  const handleCloseModals = useCallback(() => {
    setShowAreaModal(false);
    setShowDeleteConfirm(false);
    setEditingArea(null);
    setAreaToDelete(null);
  }, []);

  return {
    showAreaModal,
    setShowAreaModal,
    editingArea,
    setEditingArea,
    showDeleteConfirm,
    setShowDeleteConfirm,
    areaToDelete,
    setAreaToDelete,
    handleCreateNewArea,
    handleEditArea,
    handleDeleteArea,
    handleCloseModals
  };
};
