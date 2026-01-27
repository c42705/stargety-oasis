import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordRecoveryModule } from '../modules/auth/PasswordRecoveryModule';
import magicalBg from '../assets/magical_bg.png';

export const PasswordRecoveryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `linear-gradient(35deg, #667eea 0%, #764ba2 100%), url(${magicalBg})`,
      backgroundBlendMode: 'overlay',
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat',
      padding: '0.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <PasswordRecoveryModule
          onSuccess={() => navigate('/')}
          onSwitchToLogin={() => navigate('/')}
        />
      </div>
    </div>
  );
};

