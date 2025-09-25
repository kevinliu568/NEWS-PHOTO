
import React from 'react';

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, disabled = false, children, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg 
        hover:bg-indigo-500 transition-all duration-300 ease-in-out 
        focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75
        disabled:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-60
        transform hover:scale-105 active:scale-100
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default ActionButton;
