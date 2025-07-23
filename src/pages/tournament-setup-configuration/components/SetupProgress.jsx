import React from 'react';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';

const SetupProgress = ({ currentStep, onStepClick }) => {
  const steps = [
    { id: 'details', label: 'Details', icon: 'Trophy' },
    { id: 'players', label: 'Players', icon: 'Users' },
    { id: 'rounds', label: 'Rounds', icon: 'RotateCcw' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="glass-card p-4 space-y-3 sticky top-24">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => onStepClick(step.id)}
          disabled={index > currentStepIndex}
          className={cn(
            "w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200",
            currentStep === step.id && "bg-primary/10 text-primary font-semibold",
            index < currentStepIndex && "text-foreground hover:bg-muted/10",
            index > currentStepIndex && "text-muted-foreground opacity-50 cursor-not-allowed"
          )}
        >
          <div className={cn("flex items-center justify-center w-6 h-6 rounded-full text-xs",
            currentStep === step.id ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"
          )}>
            {index + 1}
          </div>
          <span>{step.label}</span>
        </button>
      ))}
    </div>
  );
};

export default SetupProgress;