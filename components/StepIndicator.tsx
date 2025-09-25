
import React from 'react';
import { AppStage } from '../types';

interface StepIndicatorProps {
  currentStage: AppStage;
}

const Step: React.FC<{ title: string; number: number; active: boolean; completed: boolean }> = ({ title, number, active, completed }) => {
  const circleClasses = `
    w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
    transition-all duration-300
    ${active ? 'bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-500/50' : ''}
    ${completed ? 'bg-green-500 text-white' : ''}
    ${!active && !completed ? 'bg-gray-700 text-gray-400' : ''}
  `;
  const textClasses = `
    mt-2 text-sm text-center
    ${active ? 'text-indigo-300 font-semibold' : 'text-gray-400'}
  `;

  return (
    <div className="flex flex-col items-center">
      <div className={circleClasses}>
        {completed ? '✓' : number}
      </div>
      <span className={textClasses}>{title}</span>
    </div>
  );
};

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStage }) => {
  const steps = [
    { id: 1, title: '抓取新聞' },
    { id: 2, title: '生成提示詞' },
    { id: 3, title: '生成圖片' },
  ];

  const isStepActive = (step: number) => {
    if (step === 1) return currentStage >= AppStage.INITIAL && currentStage < AppStage.PROMPT_GENERATING;
    if (step === 2) return currentStage >= AppStage.PROMPT_GENERATING && currentStage < AppStage.IMAGE_GENERATING;
    if (step === 3) return currentStage >= AppStage.IMAGE_GENERATING;
    return false;
  };

  const isStepCompleted = (step: number) => {
    if (step === 1) return currentStage >= AppStage.PROMPT_GENERATING;
    if (step === 2) return currentStage >= AppStage.IMAGE_GENERATING;
    if (step === 3) return currentStage === AppStage.IMAGE_GENERATED;
    return false;
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto my-8">
      <div className="flex items-start justify-between relative">
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-700">
             <div
            className="h-1 bg-indigo-500 transition-all duration-500"
            style={{ width: `${Math.max(0, (steps.findIndex(s => isStepActive(s.id)) / (steps.length - 1)) * 100)}%` }}
            ></div>
        </div>
        {steps.map((step) => (
          <div key={step.id} className="z-10 flex-1 flex justify-center">
             <Step 
                key={step.id} 
                number={step.id} 
                title={step.title}
                active={isStepActive(step.id)}
                completed={isStepCompleted(step.id)}
              />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
