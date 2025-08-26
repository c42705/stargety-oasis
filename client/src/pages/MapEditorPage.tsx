import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapEditorModule } from '../modules/map-editor/MapEditorModule';
import { useAuth } from '../shared/AuthContext';
import { MapDataProvider } from '../shared/MapDataContext';
import './MapEditorPage.css';

export const MapEditorPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect non-admin users back to main app
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }

    // Set page title
    document.title = 'Stargety Oasis - Map Editor';
  }, [user, navigate]);

  // Show loading or redirect for non-admin users
  if (!user?.isAdmin) {
    return (
      <div className="map-editor-page">
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>You need administrator privileges to access the Map Editor.</p>
          <p>Redirecting to main application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-editor-page">
      <MapDataProvider>
        <MapEditorModule />
      </MapDataProvider>
    </div>
  );
};
