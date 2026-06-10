import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface TopBarProps {
  title: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, actions }) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-40">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-3">
        {actions}
        <button
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
        >
          <span className="text-sm">👤</span>
        </button>
      </div>
    </header>
  );
};
