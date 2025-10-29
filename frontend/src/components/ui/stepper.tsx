import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description: string;
}

interface StepperProps {
  steps: Step[];
  activeStep: number;
  completedSteps?: number[];
  className?: string;
}

interface StepItemProps {
  step: Step;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isLast: boolean;
}

const StepItem: React.FC<StepItemProps> = ({ 
  step, 
  index, 
  isActive, 
  isCompleted, 
  isLast 
}) => {
  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center">
        {/* Step Circle */}
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : isActive
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-gray-700 border-gray-600 text-gray-400"
          )}
        >
          {isCompleted ? (
            <Check className="w-4 h-4" />
          ) : (
            <span className="text-sm font-medium">{index + 1}</span>
          )}
        </div>
        
        {/* Connecting Line */}
        {!isLast && (
          <div
            className={cn(
              "w-0.5 h-12 mt-2 transition-colors duration-300",
              isCompleted ? "bg-green-500" : "bg-gray-600"
            )}
          />
        )}
      </div>
      
      {/* Step Content */}
      <div className="ml-4 pb-8">
        <h3
          className={cn(
            "text-sm font-medium transition-colors duration-300",
            isActive || isCompleted
              ? "text-white"
              : "text-gray-400"
          )}
        >
          {step.title}
        </h3>
        <p
          className={cn(
            "text-xs mt-1 transition-colors duration-300",
            isActive || isCompleted
              ? "text-gray-300"
              : "text-gray-500"
          )}
        >
          {step.description}
        </p>
      </div>
    </div>
  );
};

export const Stepper: React.FC<StepperProps> = ({
  steps,
  activeStep,
  completedSteps = [],
  className
}) => {
  return (
    <div className={cn("w-full", className)}>
      {steps.map((step, index) => (
        <StepItem
          key={step.id}
          step={step}
          index={index}
          isActive={index === activeStep}
          isCompleted={completedSteps.includes(index) || index < activeStep}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
};

export default Stepper;
