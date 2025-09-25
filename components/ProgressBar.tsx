import React from 'react';

interface ProgressBarProps {
  progress: number;
  message: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, message }) => {
  return (
    <div className="w-full max-w-md mx-auto text-center p-8">
      <p className="text-lg text-gray-300 font-semibold mb-4">{message}</p>
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xl font-bold mt-3 text-indigo-300" aria-live="polite">
        {Math.round(progress)}%
      </p>
    </div>
  );
};

export default ProgressBar;
